/**
 * Sargolsav 2026 Tabulation & Scoring Engine
 *
 * Official Rules:
 * - Max score per judge: 100 (Total 300 across 3 judges)
 * - Absent: All 3 judges empty/0 -> total_score = null, percentage = null, grade = null, rank = null, points = 0
 * - Grade A: >= 75% (total_score >= 225) -> Grade Points = 5
 * - Grade B: >= 60% and < 75% (total_score >= 180 and < 225) -> Grade Points = 3
 * - Grade C: >= 50% and < 60% (total_score >= 150 and < 180) -> Grade Points = 1
 * - Below 50%: No Grade -> Grade Points = 0
 *
 * Rank Rules (Dense Ranking for Ties):
 * - Highest distinct score -> Rank 1 (Rank Points = 5)
 * - Second highest distinct score -> Rank 2 (Rank Points = 3)
 * - Third highest distinct score -> Rank 3 (Rank Points = 1)
 * - Others -> rank = null (Rank Points = 0)
 *
 * Total Points: Grade Points + Rank Points
 *
 * Minimum 2 Entries Rule (Page 2, Rule 12):
 * - If enforceMinEntryRule is true and fewer than 2 participants have scored (> 0),
 *   participant receives Grade only with 0 total points (no rank points, no grade points).
 */

export function parseJudgeScore(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseFloat(String(val).trim());
  if (isNaN(num)) return null;
  return Math.max(0, Math.min(100, num));
}

export function computeGrade(percentage) {
  if (percentage === null || percentage === undefined) return { grade: null, gradePoints: 0 };
  if (percentage >= 75) return { grade: 'A', gradePoints: 5 };
  if (percentage >= 60) return { grade: 'B', gradePoints: 3 };
  if (percentage >= 50) return { grade: 'C', gradePoints: 1 };
  return { grade: null, gradePoints: 0 };
}

export function calculateScoresheet(rows = [], enforceMinEntryRule = false) {
  // Step 1: Compute individual totals and percentages
  const processed = rows.map((row) => {
    const j1 = parseJudgeScore(row.judge1);
    const j2 = parseJudgeScore(row.judge2);
    const j3 = parseJudgeScore(row.judge3);

    const hasAnyJudge = j1 !== null || j2 !== null || j3 !== null;
    const isAllZero = (j1 ?? 0) === 0 && (j2 ?? 0) === 0 && (j3 ?? 0) === 0;

    if (!hasAnyJudge || isAllZero) {
      return {
        ...row,
        judge1: j1,
        judge2: j2,
        judge3: j3,
        total_score: null,
        percentage: null,
        grade: null,
        gradePoints: 0,
        rank: null,
        rankPoints: 0,
        points: 0,
        isAbsent: true,
      };
    }

    const total = Math.round(((j1 ?? 0) + (j2 ?? 0) + (j3 ?? 0)) * 100) / 100;
    const pct = Math.round((total / 300) * 10000) / 100; // rounded to 2 decimals
    const { grade, gradePoints } = computeGrade(pct);

    return {
      ...row,
      judge1: j1,
      judge2: j2,
      judge3: j3,
      total_score: total,
      percentage: pct,
      grade,
      gradePoints,
      rank: null,
      rankPoints: 0,
      points: 0,
      isAbsent: false,
    };
  });

  // Step 2: Dense Ranking for participants with total_score > 0
  const scoredParticipants = processed.filter((r) => !r.isAbsent && (r.total_score ?? 0) > 0);

  // Single entry rule check
  const isSingleEntrySuppressed = enforceMinEntryRule && scoredParticipants.length < 2;

  if (isSingleEntrySuppressed) {
    // Under Page 2 Rule 12: Grade only, 0 points
    return processed.map((row) => {
      if (row.isAbsent) return row;
      return {
        ...row,
        rank: null,
        rankPoints: 0,
        points: 0, // 0 points for single entry rule
      };
    });
  }

  // Get unique distinct scores in descending order
  const distinctScores = Array.from(
    new Set(scoredParticipants.map((r) => r.total_score))
  ).sort((a, b) => b - a);

  const scoreToRankMap = new Map();
  if (distinctScores.length > 0) scoreToRankMap.set(distinctScores[0], { rank: 1, rankPoints: 5 });
  if (distinctScores.length > 1) scoreToRankMap.set(distinctScores[1], { rank: 2, rankPoints: 3 });
  if (distinctScores.length > 2) scoreToRankMap.set(distinctScores[2], { rank: 3, rankPoints: 1 });

  return processed.map((row) => {
    if (row.isAbsent || (row.total_score ?? 0) <= 0) {
      return row;
    }

    const rankInfo = scoreToRankMap.get(row.total_score) || { rank: null, rankPoints: 0 };
    const totalPoints = (row.gradePoints || 0) + (rankInfo.rankPoints || 0);

    return {
      ...row,
      rank: rankInfo.rank,
      rankPoints: rankInfo.rankPoints,
      points: totalPoints,
    };
  });
}

/**
 * Strict comparator for published results and awardees.
 * Hierarchy:
 * 1. Manual Display Order (display_order / sort_order if set by Admin)
 * 2. Official Rank (rank 1, 2, 3 first, ascending)
 * 3. Total Score (total_score descending): Higher total scores MUST come before lower scores
 * 4. Points (points descending): Higher points first
 * 5. Grade (A > B > C): Alphabetical grade order
 * 6. Registration Number (reg_no ascending): Final tie-breaker
 */
export function comparePublishedResults(a, b) {
  // 1. Manual Display Order (display_order / sort_order if present)
  const orderA = a.sort_order ?? a.display_order;
  const orderB = b.sort_order ?? b.display_order;
  if (orderA !== undefined && orderA !== null && orderB !== undefined && orderB !== null) {
    const numOrderA = Number(orderA);
    const numOrderB = Number(orderB);
    if (!isNaN(numOrderA) && !isNaN(numOrderB) && numOrderA !== numOrderB) {
      return numOrderA - numOrderB;
    }
  }

  // 2. Official Rank (rank 1, 2, 3 first, ascending)
  const rankA = a.rank ? parseInt(a.rank, 10) : null;
  const rankB = b.rank ? parseInt(b.rank, 10) : null;
  if (rankA && rankB && rankA !== rankB) {
    return rankA - rankB;
  }
  if (rankA && !rankB) return -1;
  if (!rankA && rankB) return 1;

  // 3. Graded contenders vs Un-graded contenders
  // Any participant with an official rank or grade comes before an un-graded/un-ranked participant
  const isGradedOrRankedA = Boolean(rankA || (a.grade && String(a.grade).trim()));
  const isGradedOrRankedB = Boolean(rankB || (b.grade && String(b.grade).trim()));
  if (isGradedOrRankedA && !isGradedOrRankedB) return -1;
  if (!isGradedOrRankedA && isGradedOrRankedB) return 1;

  // 4. Total Score (total_score descending): Higher total scores MUST always come before lower total scores
  const hasScoreA = a.total_score !== null && a.total_score !== undefined && a.total_score !== '';
  const hasScoreB = b.total_score !== null && b.total_score !== undefined && b.total_score !== '';
  if (hasScoreA && hasScoreB) {
    const numScoreA = Number(a.total_score);
    const numScoreB = Number(b.total_score);
    if (!isNaN(numScoreA) && !isNaN(numScoreB) && numScoreA !== numScoreB) {
      return numScoreB - numScoreA; // Descending
    }
  } else if (hasScoreA && !hasScoreB) {
    return -1;
  } else if (!hasScoreA && hasScoreB) {
    return 1;
  }

  // 4. Points (points descending): Higher points first
  const ptsA = a.points !== null && a.points !== undefined && a.points !== '' ? Number(a.points) : 0;
  const ptsB = b.points !== null && b.points !== undefined && b.points !== '' ? Number(b.points) : 0;
  if (!isNaN(ptsA) && !isNaN(ptsB) && ptsA !== ptsB) {
    return ptsB - ptsA; // Descending
  }

  // 5. Grade (A > B > C): Alphabetical grade order
  const gradeOrder = { A: 1, B: 2, C: 3 };
  const gA = a.grade ? (gradeOrder[String(a.grade).trim().toUpperCase()] || 99) : 99;
  const gB = b.grade ? (gradeOrder[String(b.grade).trim().toUpperCase()] || 99) : 99;
  if (gA !== gB) {
    return gA - gB;
  }

  // 6. Registration Number (reg_no ascending): Final tie-breaker
  const regA = parseInt(a.reg_no, 10) || 0;
  const regB = parseInt(b.reg_no, 10) || 0;
  return regA - regB;
}
