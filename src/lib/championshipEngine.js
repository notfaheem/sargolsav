/**
 * Championship & Standings Calculation Engine for Sargolsav 2026.
 *
 * Rules:
 * 1. Unit Championship:
 *    - Only published items count (is_published === true).
 *    - GROUP items deduplication: For items with mode === 'GROUP', a unit is awarded points
 *      only ONCE per item (i.e. Math.max of points achieved by participants of that unit in that item).
 *    - SINGLE items: points sum normally.
 *    - Tie-breaking: Total Points DESC, then Rank 1 count DESC, then Rank 2 count DESC, then Rank 3 count DESC.
 *
 * 2. Individual Championship (Kalaprathibha / Top Performer - Official Manual Page 4):
 *    - Calculated per Category (KIDS, CHILDREN, SUB JUNIOR, JUNIOR, TEENS).
 *    - Only SINGLE items count for the primary score.
 *    - Qualification: Must have >= 1 First Rank in a single item AND Total Single Points > 15 (>= 16 pts).
 *    - Tie-breaker: Published GROUP item score (Rank 1=3pts, Rank 2=2pts, Rank 3=1pt; Grade A=3pts, Grade B=2pts, Grade C=1pt).
 *    - Joint Champions if tie-breaker is equal.
 *    - Early festival mode: If no one has qualified yet, provides live contenders with progress toward 16 pts.
 */

/**
 * Computes Unit Standings (Overall or by Category).
 *
 * @param {Array} participations - Array of participations with { item_code, reg_no, rank, grade, points }
 * @param {Array} participants - Array of participants with { reg_no, name, unit, category, madrasa }
 * @param {Array} items - Array of items with { code, name_ml, name_en, category, mode, is_published }
 * @param {string|null} categoryFilter - Optional category ('KIDS', 'CHILDREN', etc.) or null for overall
 * @returns {Array} Array of ranked unit objects with breakdowns
 */
export function computeUnitStandings(participations = [], participants = [], items = [], categoryFilter = null) {
  // 1. Create lookup maps
  const itemMap = new Map();
  items.forEach((item) => {
    itemMap.set(item.code, item);
  });

  const participantMap = new Map();
  participants.forEach((p) => {
    participantMap.set(p.reg_no, p);
  });

  // 2. Filter participations for published items (and category if specified)
  const validParticipations = participations.filter((part) => {
    const item = itemMap.get(part.item_code);
    if (!item || !item.is_published) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    return true;
  });

  // 3. Separate SINGLE vs GROUP participations to apply deduplication
  // Group key: `${item_code}__${unit}`
  const groupScoresMap = new Map(); // key -> { maxPoints, item, unit, entries: [] }
  const singleEntries = [];

  validParticipations.forEach((part) => {
    const item = itemMap.get(part.item_code);
    const student = participantMap.get(part.reg_no);
    const unit = student?.unit || 'Independent';

    if (item.mode === 'GROUP') {
      const key = `${item.code}__${unit}`;
      const pts = Number(part.points) || 0;
      if (!groupScoresMap.has(key)) {
        groupScoresMap.set(key, {
          itemCode: item.code,
          item,
          unit,
          maxPoints: pts,
          rank: part.rank,
          grade: part.grade,
          entries: [{ ...part, studentName: student?.name || 'Unknown' }],
        });
      } else {
        const existing = groupScoresMap.get(key);
        existing.entries.push({ ...part, studentName: student?.name || 'Unknown' });
        if (pts > existing.maxPoints) {
          existing.maxPoints = pts;
          existing.rank = part.rank;
          existing.grade = part.grade;
        }
      }
    } else {
      singleEntries.push({
        ...part,
        item,
        unit,
        studentName: student?.name || 'Unknown',
        points: Number(part.points) || 0,
      });
    }
  });

  // 4. Aggregate points per unit
  const unitStatsMap = new Map();

  function getOrCreateUnit(unit) {
    if (!unitStatsMap.has(unit)) {
      unitStatsMap.set(unit, {
        unit,
        totalPoints: 0,
        rank1Count: 0,
        rank2Count: 0,
        rank3Count: 0,
        gradeACount: 0,
        gradeBCount: 0,
        gradeCCount: 0,
        breakdown: [], // detailed list of score contributors
      });
    }
    return unitStatsMap.get(unit);
  }

  // A. Add single entries
  singleEntries.forEach((entry) => {
    const u = getOrCreateUnit(entry.unit);
    u.totalPoints += entry.points;
    if (entry.rank === 1) u.rank1Count += 1;
    if (entry.rank === 2) u.rank2Count += 1;
    if (entry.rank === 3) u.rank3Count += 1;

    if (entry.grade === 'A') u.gradeACount += 1;
    if (entry.grade === 'B') u.gradeBCount += 1;
    if (entry.grade === 'C') u.gradeCCount += 1;

    if (entry.points > 0 || entry.rank || entry.grade) {
      u.breakdown.push({
        type: 'SINGLE',
        itemCode: entry.item.code,
        itemNameMl: entry.item.name_ml,
        itemNameEn: entry.item.name_en,
        category: entry.item.category,
        studentName: entry.studentName,
        regNo: entry.reg_no,
        rank: entry.rank,
        grade: entry.grade,
        points: entry.points,
      });
    }
  });

  // B. Add deduplicated group entries
  groupScoresMap.forEach((grp) => {
    const u = getOrCreateUnit(grp.unit);
    u.totalPoints += grp.maxPoints;
    if (grp.rank === 1) u.rank1Count += 1;
    if (grp.rank === 2) u.rank2Count += 1;
    if (grp.rank === 3) u.rank3Count += 1;

    if (grp.grade === 'A') u.gradeACount += 1;
    if (grp.grade === 'B') u.gradeBCount += 1;
    if (grp.grade === 'C') u.gradeCCount += 1;

    if (grp.maxPoints > 0 || grp.rank || grp.grade) {
      u.breakdown.push({
        type: 'GROUP',
        itemCode: grp.item.code,
        itemNameMl: grp.item.name_ml,
        itemNameEn: grp.item.name_en,
        category: grp.item.category,
        studentName: `Team (${grp.entries.length} participants)`,
        regNo: grp.entries.map((e) => `#${e.reg_no}`).join(', '),
        rank: grp.rank,
        grade: grp.grade,
        points: grp.maxPoints,
      });
    }
  });

  // 5. Convert to array and sort
  const standings = Array.from(unitStatsMap.values());
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.rank1Count !== a.rank1Count) return b.rank1Count - a.rank1Count;
    if (b.rank2Count !== a.rank2Count) return b.rank2Count - a.rank2Count;
    if (b.rank3Count !== a.rank3Count) return b.rank3Count - a.rank3Count;
    return a.unit.localeCompare(b.unit);
  });

  // 6. Assign dense positions (supporting ties)
  let currentRank = 1;
  standings.forEach((item, index) => {
    if (index > 0) {
      const prev = standings[index - 1];
      const isTied =
        item.totalPoints === prev.totalPoints &&
        item.rank1Count === prev.rank1Count &&
        item.rank2Count === prev.rank2Count &&
        item.rank3Count === prev.rank3Count;
      if (!isTied) {
        currentRank = index + 1;
      }
    }
    item.position = currentRank;
  });

  return standings;
}

/**
 * Computes Individual Championship / Kalaprathibha standings for a specific category.
 *
 * Rule Page 4:
 * 1. Only SINGLE items count towards the primary score.
 * 2. Qualification: At least one First Rank (rank === 1) AND Total Single Points > 15 (>= 16 pts).
 * 3. Tie-breaker: Published GROUP item scores:
 *    - Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt.
 *    - Grade A = 3 pts, Grade B = 2 pts, Grade C = 1 pt.
 * 4. If still equal: Joint Champions.
 *
 * @param {Array} participations
 * @param {Array} participants
 * @param {Array} items
 * @param {string} category ('KIDS' | 'CHILDREN' | 'SUB JUNIOR' | 'JUNIOR' | 'TEENS')
 * @returns {Object} { qualifiedChampions: [], contenders: [], allPerformers: [] }
 */
export function computeIndividualChampionship(participations = [], participants = [], items = [], category) {
  const itemMap = new Map();
  items.forEach((item) => {
    itemMap.set(item.code, item);
  });

  const participantMap = new Map();
  participants.forEach((p) => {
    participantMap.set(p.reg_no, p);
  });

  // Track each participant in the category
  const studentMap = new Map();

  function getStudentStats(regNo) {
    if (!studentMap.has(regNo)) {
      const profile = participantMap.get(regNo) || {};
      studentMap.set(regNo, {
        regNo,
        name: profile.name || 'Unknown',
        unit: profile.unit || 'Unknown',
        madrasa: profile.madrasa || '',
        category: profile.category || category,
        singlePoints: 0,
        rank1Count: 0,
        rank2Count: 0,
        rank3Count: 0,
        gradeACount: 0,
        gradeBCount: 0,
        gradeCCount: 0,
        groupTieBreakerPoints: 0,
        singleBreakdown: [],
        groupBreakdown: [],
      });
    }
    return studentMap.get(regNo);
  }

  // Iterate over participations
  participations.forEach((part) => {
    const item = itemMap.get(part.item_code);
    if (!item || !item.is_published) return;
    if (item.category !== category) return;

    const stats = getStudentStats(part.reg_no);
    const pts = Number(part.points) || 0;

    if (item.mode === 'SINGLE') {
      stats.singlePoints += pts;
      if (part.rank === 1) stats.rank1Count += 1;
      if (part.rank === 2) stats.rank2Count += 1;
      if (part.rank === 3) stats.rank3Count += 1;
      if (part.grade === 'A') stats.gradeACount += 1;
      if (part.grade === 'B') stats.gradeBCount += 1;
      if (part.grade === 'C') stats.gradeCCount += 1;

      if (pts > 0 || part.rank || part.grade) {
        stats.singleBreakdown.push({
          itemCode: item.code,
          itemNameMl: item.name_ml,
          itemNameEn: item.name_en,
          rank: part.rank,
          grade: part.grade,
          points: pts,
        });
      }
    } else if (item.mode === 'GROUP') {
      // Calculate group tie breaker points according to Manual Page 4:
      // Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt.
      // Grade A = 3 pts, Grade B = 2 pts, Grade C = 1 pt.
      let rankTiePts = 0;
      if (part.rank === 1) rankTiePts = 3;
      else if (part.rank === 2) rankTiePts = 2;
      else if (part.rank === 3) rankTiePts = 1;

      let gradeTiePts = 0;
      if (part.grade === 'A') gradeTiePts = 3;
      else if (part.grade === 'B') gradeTiePts = 2;
      else if (part.grade === 'C') gradeTiePts = 1;

      const totalTie = rankTiePts + gradeTiePts;
      stats.groupTieBreakerPoints += totalTie;

      if (totalTie > 0) {
        stats.groupBreakdown.push({
          itemCode: item.code,
          itemNameMl: item.name_ml,
          itemNameEn: item.name_en,
          rank: part.rank,
          grade: part.grade,
          tiePoints: totalTie,
        });
      }
    }
  });

  const allPerformers = Array.from(studentMap.values()).filter(
    (s) => s.singlePoints > 0 || s.rank1Count > 0
  );

  // Sort performers:
  // 1. Single points DESC
  // 2. Rank 1 count DESC
  // 3. Group tie breaker points DESC
  // 4. Rank 2 count DESC
  allPerformers.sort((a, b) => {
    if (b.singlePoints !== a.singlePoints) return b.singlePoints - a.singlePoints;
    if (b.rank1Count !== a.rank1Count) return b.rank1Count - a.rank1Count;
    if (b.groupTieBreakerPoints !== a.groupTieBreakerPoints)
      return b.groupTieBreakerPoints - a.groupTieBreakerPoints;
    if (b.rank2Count !== a.rank2Count) return b.rank2Count - a.rank2Count;
    return a.name.localeCompare(b.name);
  });

  // Determine official qualified champions:
  // Must have: rank1Count >= 1 AND singlePoints > 15 (>= 16)
  const qualified = allPerformers.filter(
    (s) => s.rank1Count >= 1 && s.singlePoints > 15
  );

  // If there are qualified candidates, top candidate(s) are champion(s)
  let qualifiedChampions = [];
  if (qualified.length > 0) {
    const highestScore = qualified[0].singlePoints;
    const highestTieBreaker = qualified[0].groupTieBreakerPoints;

    qualifiedChampions = qualified.filter(
      (s) =>
        s.singlePoints === highestScore &&
        s.groupTieBreakerPoints === highestTieBreaker
    );
  }

  // Contenders (Top 10 single scorers who are in contention)
  const contenders = allPerformers.slice(0, 10).map((s) => {
    const isQualified = s.rank1Count >= 1 && s.singlePoints > 15;
    const pointsNeeded = Math.max(0, 16 - s.singlePoints);
    const needsFirstRank = s.rank1Count === 0;

    let statusText = '';
    if (isQualified) {
      statusText = 'Qualified Official Champion';
    } else if (pointsNeeded > 0 && needsFirstRank) {
      statusText = `Needs ${pointsNeeded} more pts & 1st Rank`;
    } else if (pointsNeeded > 0) {
      statusText = `Needs ${pointsNeeded} more pts`;
    } else if (needsFirstRank) {
      statusText = 'Needs at least one 1st Rank';
    } else {
      statusText = 'Qualified';
    }

    return {
      ...s,
      isQualified,
      pointsNeeded,
      needsFirstRank,
      statusText,
      progressPercentage: Math.min(100, Math.round((s.singlePoints / 16) * 100)),
    };
  });

  return {
    qualifiedChampions,
    contenders,
    allPerformers,
  };
}
