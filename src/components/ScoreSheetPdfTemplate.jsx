import React from 'react';
import { SCORESHEET_HEADER_B64, SCORESHEET_FOOTER_B64 } from '../assets/scoresheetAssets';

/**
 * Determines whether an item is STAGE or OFF STAGE based on item metadata or conventions.
 */
export function getItemType(item) {
  if (item?.type) return item.type.toUpperCase();
  if (item?.stage_type) return item.stage_type.toUpperCase();
  const name = ((item?.name_en || '') + ' ' + (item?.name_ml || '')).toLowerCase();
  const offStageKeywords = [
    'tajweed', 'thajweed', 'തജ്‌വീദ്', 'തജ്വീദ്',
    'drawing', 'ഡ്രോയിംഗ്', 'വര', 'കളറിംഗ്', 'colouring', 'coloring',
    'pencil', 'പെൻസിൽ', 'crayon', 'ക്രയോൺ', 'painting',
    'essay', 'രചന', 'ലേഖനം', 'കവിതാരചന', 'കഥാരചന',
    'quiz', 'പ്രശ്നോത്തരി', 'ക്വിസ്',
    'dictation', 'കേട്ടെഴുത്ത്',
    'memory test', 'ഓർമ പരിശോധന',
    'word building', 'പദ നിർമാണം',
    'calligraphy', 'കാലിഗ്രഫി',
    'water colour', 'വാട്ടർ കളർ', 'പോസ്റ്റർ', 'poster',
    'translation', 'വിവർത്തനം',
    'magazine', 'പത്രം',
  ];
  return offStageKeywords.some((kw) => name.includes(kw)) ? 'OFF STAGE' : 'STAGE';
}

/**
 * Official Consolidated Score Sheet A4 Template matching ITEM_207.pdf.
 * Rendered off-screen and captured by html2canvas + jsPDF.
 */
export default function ScoreSheetPdfTemplate({ containerId, item, rows = [] }) {
  if (!item) return null;

  // Format Item Name (prefer English uppercase if available, with Malayalam)
  const itemType = getItemType(item);
  const itemMode = item.mode ? item.mode.toUpperCase() : 'SINGLE';
  const itemNameDisplay = item.name_en ? item.name_en.toUpperCase() : (item.name_ml || '—');

  // Pad table with blank rows up to at least 12 rows to match standard physical sheet
  const minRows = 12;
  const displayRows = [...rows];
  while (displayRows.length < minRows) {
    displayRows.push({ isPlaceholder: true });
  }

  return (
    <div
      id={containerId}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: '800px',
        backgroundColor: '#ffffff',
        zIndex: -9999,
        pointerEvents: 'none',
      }}
      className="p-8 text-[#1B254B] bg-white font-sans"
    >
      {/* 1. Official Header Image (Left: Learn Think Dedicate, Center: Sargolsav 2026, Right: CIER) */}
      <div className="w-full flex justify-center mb-5">
        <img
          src={SCORESHEET_HEADER_B64}
          alt="Sargolsav 2026 Header Banner"
          className="w-full h-auto object-contain max-h-[140px]"
        />
      </div>

      {/* 2. Metadata Block with Dotted Leader Lines */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-2 mb-4 text-xs font-sans">
        {/* Left Column */}
        <div className="space-y-2">
          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">CATEGORY:</span>
            <span className="font-semibold text-black uppercase pr-1.5">{item.category || '—'}</span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>

          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">ITEM TYPE:</span>
            <span className="font-semibold text-black uppercase pr-1.5">{itemType}</span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>

          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">ITEM MODE:</span>
            <span className="font-semibold text-black uppercase pr-1.5">{itemMode}</span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">ITEM CODE:</span>
            <span className="font-semibold text-black font-mono pr-1.5">{item.code}</span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>

          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">ITEM NAME:</span>
            <span className="font-semibold text-black uppercase font-ml pr-1.5 truncate max-w-[210px]">
              {itemNameDisplay}
            </span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>

          <div className="flex items-baseline">
            <span className="font-bold tracking-wide w-28 text-black shrink-0">STAGE:</span>
            <span className="font-semibold text-black uppercase pr-1.5"></span>
            <div className="flex-1 border-b border-dotted border-slate-500 mb-1" />
          </div>
        </div>
      </div>

      {/* 3. Sheet Title */}
      <div className="text-center my-4">
        <h2 className="text-xl font-black tracking-wider text-black uppercase">
          CONSOLIDATED SCORE SHEET
        </h2>
      </div>

      {/* 4. 9-Column Score Table matching ITEM_207.pdf */}
      <table className="w-full text-xs text-center border-collapse border border-black mb-6">
        <thead>
          <tr className="font-bold text-[11px] text-black uppercase tracking-wider">
            <th rowSpan={2} className="border border-black py-2 px-1 w-12 bg-white">
              SL.NO
            </th>
            <th rowSpan={2} className="border border-black py-2 px-2 w-28 bg-white">
              CHEST NUMBER
            </th>
            <th rowSpan={2} className="border border-black py-2 px-2 w-20 bg-white">
              REG.NO
            </th>
            <th colSpan={3} className="border border-black py-1 px-2 bg-white">
              SCORE
            </th>
            <th rowSpan={2} className="border border-black py-2 px-2 w-24 bg-white">
              TOTAL SCORE
            </th>
            <th rowSpan={2} className="border border-black py-2 px-1 w-16 bg-white">
              GRADE
            </th>
            <th rowSpan={2} className="border border-black py-2 px-1 w-16 bg-white">
              RANK
            </th>
            <th rowSpan={2} className="border border-black py-2 px-2 w-24 bg-white">
              REMARKS
            </th>
          </tr>
          <tr className="font-bold text-[10px] text-black uppercase tracking-wider">
            <th className="border border-black py-1 px-2 w-16 bg-white">
              JUDGE 1
            </th>
            <th className="border border-black py-1 px-2 w-16 bg-white">
              JUDGE 2
            </th>
            <th className="border border-black py-1 px-2 w-16 bg-white">
              JUDGE 3
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => {
            const isPlaceholder = Boolean(row.isPlaceholder);
            return (
              <tr key={idx} style={{ height: '30px' }} className="text-black">
                {/* SL.NO */}
                <td className="border border-black py-1 px-1 font-mono">
                  {isPlaceholder ? '' : idx + 1}
                </td>

                {/* CHEST NUMBER */}
                <td className="border border-black py-1 px-2 font-mono font-medium">
                  {isPlaceholder ? '' : row.chest_no || ''}
                </td>

                {/* REG.NO */}
                <td className="border border-black py-1 px-2 font-mono font-semibold">
                  {isPlaceholder ? '' : row.reg_no || ''}
                </td>

                {/* JUDGE 1 */}
                <td className="border border-black py-1 px-2 font-mono">
                  {!isPlaceholder && row.judge1 !== null && row.judge1 !== undefined && row.judge1 !== ''
                    ? row.judge1
                    : ''}
                </td>

                {/* JUDGE 2 */}
                <td className="border border-black py-1 px-2 font-mono">
                  {!isPlaceholder && row.judge2 !== null && row.judge2 !== undefined && row.judge2 !== ''
                    ? row.judge2
                    : ''}
                </td>

                {/* JUDGE 3 */}
                <td className="border border-black py-1 px-2 font-mono">
                  {!isPlaceholder && row.judge3 !== null && row.judge3 !== undefined && row.judge3 !== ''
                    ? row.judge3
                    : ''}
                </td>

                {/* TOTAL SCORE */}
                <td className="border border-black py-1 px-2 font-mono font-bold">
                  {!isPlaceholder && row.total_score !== null && row.total_score !== undefined && row.total_score !== ''
                    ? row.total_score
                    : ''}
                </td>

                {/* GRADE */}
                <td className="border border-black py-1 px-1 font-bold">
                  {isPlaceholder ? '' : row.grade || ''}
                </td>

                {/* RANK */}
                <td className="border border-black py-1 px-1 font-bold">
                  {isPlaceholder ? '' : row.rank || ''}
                </td>

                {/* REMARKS */}
                <td className="border border-black py-1 px-2 text-[10px]">
                  {isPlaceholder ? '' : row.remarks || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 5. Signatures Block */}
      <div className="text-[10px] font-bold text-black uppercase space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>NAME &amp; SIGNATURE OF JUDGE 1 :</div>
          <div>NAME &amp; SIGNATURE OF JUDGE 2 :</div>
          <div>NAME &amp; SIGNATURE OF JUDGE 3 :</div>
        </div>
        <div className="pt-2">
          <p>NAME OF STAGE MANAGER :</p>
        </div>
        <div>
          <p>SIGNATURE :</p>
        </div>
      </div>

      {/* 6. Footer Banner Image (MSM KERALAM & CIER | Markazudawa, R.M Road - Kozhikkode) */}
      <div className="w-full flex justify-center mt-auto pt-2">
        <img
          src={SCORESHEET_FOOTER_B64}
          alt="MSM Keralam & CIER Footer"
          className="w-full h-auto object-contain max-h-[90px]"
        />
      </div>
    </div>
  );
}
