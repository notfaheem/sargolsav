/**
 * Robust CSV / TSV parser for official MSM Sargolsav exports and clipboard table pastes.
 *
 * Handles:
 * - Comma-Separated Values (CSV) with quoted fields containing commas
 * - Tab-Separated Values (TSV) from web table copy-pastes
 * - Automatic header detection and flexible column mapping
 */

export function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseItemCodes(rawString) {
  if (!rawString) return [];
  // Handles strings like "101, 102, 103," or "105" or "[101, 102]"
  const cleaned = String(rawString).replace(/[\[\]"]/g, '');
  return cleaned
    .split(/[,;\t\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n) && n > 0);
}

export function normalizeCategory(cat) {
  if (!cat) return 'KIDS';
  const upper = cat.trim().toUpperCase();
  if (upper.includes('SUB') || upper.includes('SUB-JUNIOR') || upper.includes('SUBJUNIOR')) {
    return 'SUB JUNIOR';
  }
  if (upper.includes('KID')) return 'KIDS';
  if (upper.includes('CHILD')) return 'CHILDREN';
  if (upper.includes('JUNIOR')) return 'JUNIOR';
  if (upper.includes('TEEN')) return 'TEENS';
  return upper;
}

export function parseParticipantData(rawText) {
  if (!rawText || !rawText.trim()) {
    return { participants: [], enrollments: [], errors: [] };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { participants: [], enrollments: [], errors: [] };
  }

  // Determine primary delimiter (tab vs comma)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= 3 ? '\t' : ',';

  // Check if first line is a header
  const firstTokens = parseCSVLine(firstLine, delimiter).map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasHeader =
    firstTokens.some((t) => t.includes('unique') || t.includes('reg') || t.includes('name') || t.includes('participant') || t.includes('category'));

  let startIndex = 0;
  let colMap = {
    uniqueId: 1,
    category: 2,
    name: 3,
    district: 4,
    zone: 5,
    unit: 6,
    madrasa: 7,
    single: 8,
    group: 9,
  };

  if (hasHeader) {
    startIndex = 1;
    const headerRow = parseCSVLine(lines[0], delimiter);
    headerRow.forEach((col, idx) => {
      const clean = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes('unique') || clean === 'regno' || clean === 'reg' || clean === 'uid') colMap.uniqueId = idx;
      else if (clean === 'category' || clean === 'cat') colMap.category = idx;
      else if (clean.includes('name') || clean.includes('participant')) colMap.name = idx;
      else if (clean.includes('district')) colMap.district = idx;
      else if (clean.includes('zone')) colMap.zone = idx;
      else if (clean.includes('unit')) colMap.unit = idx;
      else if (clean.includes('madrasa') || clean.includes('institution')) colMap.madrasa = idx;
      else if (clean === 'single') colMap.single = idx;
      else if (clean === 'group') colMap.group = idx;
    });
  }

  const participants = [];
  const enrollments = [];
  const errors = [];
  const seenRegNos = new Set();

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const row = parseCSVLine(rawLine, delimiter);
    if (row.length < 2) continue;

    // Check if line is accidental duplicate header
    const rowFirstTokens = row.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (rowFirstTokens.includes('uniqueid') || rowFirstTokens.includes('participantname')) {
      continue;
    }

    const regNoRaw = row[colMap.uniqueId] || (row.length > 1 ? row[1] : row[0]);
    const regNo = parseInt(String(regNoRaw).replace(/[^0-9]/g, ''), 10);

    if (!regNo || isNaN(regNo)) {
      errors.push(`Row ${i + 1}: Skipped (Invalid or missing Registration No: "${regNoRaw}")`);
      continue;
    }

    const name = (row[colMap.name] || row[3] || '').trim();
    if (!name) {
      errors.push(`Row ${i + 1} (Reg No ${regNo}): Skipped (Participant name is empty)`);
      continue;
    }

    const category = normalizeCategory(row[colMap.category] || row[2] || 'KIDS');
    const district = (row[colMap.district] || row[4] || 'Malappuram').trim();
    const zone = (row[colMap.zone] || row[5] || 'Nilambur').trim();
    const unit = (row[colMap.unit] || row[6] || '').trim().toUpperCase();
    const madrasa = (row[colMap.madrasa] || row[7] || '').trim();

    // Parse single and group items
    const singleItems = parseItemCodes(row[colMap.single] || (row.length > 8 ? row[8] : ''));
    const groupItems = parseItemCodes(row[colMap.group] || (row.length > 9 ? row[9] : ''));
    const allItems = [...new Set([...singleItems, ...groupItems])];

    const participantObj = {
      reg_no: regNo,
      name,
      category,
      district,
      zone,
      unit,
      madrasa,
      items: allItems,
    };

    participants.push(participantObj);
    seenRegNos.add(regNo);

    // Create enrollment records
    allItems.forEach((code) => {
      enrollments.push({
        item_code: code,
        reg_no: regNo,
      });
    });
  }

  return { participants, enrollments, errors };
}
