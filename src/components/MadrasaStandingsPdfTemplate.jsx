import React from 'react';
import { getCleanMadrasaName } from '../lib/madrasaHelper';

export default function MadrasaStandingsPdfTemplate({
  containerIdPrefix = 'madrasa-standings-pdf',
  overallStandings = [],
  standingsByCategory = {},
  categories = [],
  madrasaUnitMap = null,
}) {
  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'bg-amber-400 text-amber-950 border-amber-500';
    if (rank === 2) return 'bg-slate-300 text-slate-900 border-slate-400';
    if (rank === 3) return 'bg-[#F26430] text-white border-orange-600';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  // Helper to get formatted clean name
  const formatMadrasaName = (unitName) => {
    return getCleanMadrasaName({ unit: unitName, madrasa: unitName }, madrasaUnitMap) || unitName;
  };

  // Pre-calculate per-category points lookup for overall table
  // categoryMap[catId][unitName] -> points
  const categoryPointsMap = {};
  categories.forEach((cat) => {
    categoryPointsMap[cat.id] = new Map();
    const list = standingsByCategory[cat.id] || [];
    list.forEach((u) => {
      categoryPointsMap[cat.id].set(u.unit, u.totalPoints);
    });
  });

  return (
    <div
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        zIndex: -9999,
        pointerEvents: 'none',
      }}
    >
      {/* ======================================================== */}
      {/* PAGE 1: OVERALL MADRASA CHAMPIONSHIP MASTER TABLE        */}
      {/* ======================================================== */}
      <div
        id={`${containerIdPrefix}-page-overall`}
        style={{
          width: '900px',
          minWidth: '900px',
          maxWidth: '900px',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
        }}
        className="w-[900px] min-w-[900px] max-w-[900px] p-8 text-slate-900 bg-white font-sans mb-8 border border-slate-200"
      >
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1B254B] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Sargolsav Logo"
              className="h-14 w-auto object-contain"
            />
            <div>
              <h1 className="font-ml text-xl font-black text-[#1B254B] leading-tight">
                നിലമ്പൂർ മണ്ഡലം സർഗോത്സവ് - 2026
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                MSM-CIER Kerala | Amal College, Myladi
              </p>
              <p className="text-[10px] font-semibold text-[#F26430]">
                Sub-District Tabulation & Result Desk
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block border-2 border-emerald-600 bg-emerald-50 text-emerald-950 px-3 py-1 rounded-xl font-black text-xs tracking-wider uppercase whitespace-nowrap">
              🕌 OVERALL MADRASA POINTS
            </div>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
              Official Master Standings
            </p>
          </div>
        </div>

        {/* 2. Official Rule & Scoring Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-[#1B254B]">
              മദ്റസ ചാമ്പ്യൻഷിപ്പ് — സമഗ്ര പോയിന്റ് പട്ടിക (Overall Madrasa Championship)
            </h2>
            <p className="text-[10px] text-slate-600 font-ml mt-0.5">
              മാനദണ്ഡം: ഗ്രേഡ് പോയിന്റുകൾ മാത്രം (A = 5, B = 3, C = 1). സ്ഥാനങ്ങൾക്ക് പ്രത്യേക പോയിന്റുകളില്ല. ഗ്രൂപ്പ് ഇനങ്ങളിൽ ഒരു മദ്റസക്ക് ഒരു തവണ മാത്രം പോയിന്റ്.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold bg-[#1B254B] text-white px-2.5 py-1 rounded-lg font-mono">
              {overallStandings.length} MADRASAS
            </span>
          </div>
        </div>

        {/* 3. Overall Master Table (11 Columns) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#1B254B] text-white uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 text-center w-12 font-bold whitespace-nowrap border-r border-slate-700">
                  RANK
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-slate-700">
                  MADRASA NAME
                </th>
                <th className="py-2.5 px-2 text-center w-14 font-bold whitespace-nowrap border-r border-slate-700 bg-[#162042]">
                  KIDS
                </th>
                <th className="py-2.5 px-2 text-center w-14 font-bold whitespace-nowrap border-r border-slate-700 bg-[#162042]">
                  CHILDREN
                </th>
                <th className="py-2.5 px-2 text-center w-16 font-bold whitespace-nowrap border-r border-slate-700 bg-[#162042]">
                  SUB JR
                </th>
                <th className="py-2.5 px-2 text-center w-14 font-bold whitespace-nowrap border-r border-slate-700 bg-[#162042]">
                  JUNIOR
                </th>
                <th className="py-2.5 px-2 text-center w-14 font-bold whitespace-nowrap border-r border-slate-700 bg-[#162042]">
                  TEENS
                </th>
                <th className="py-2.5 px-2 text-center w-10 font-bold whitespace-nowrap border-r border-slate-700 text-amber-300">
                  🥇 1ST
                </th>
                <th className="py-2.5 px-2 text-center w-10 font-bold whitespace-nowrap border-r border-slate-700 text-slate-300">
                  🥈 2ND
                </th>
                <th className="py-2.5 px-2 text-center w-10 font-bold whitespace-nowrap border-r border-slate-700 text-orange-300">
                  🥉 3RD
                </th>
                <th className="py-2.5 px-3 text-right w-24 font-black whitespace-nowrap bg-[#0F172A] text-amber-300">
                  TOTAL PTS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {overallStandings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic text-xs">
                    No madrasa scores recorded yet. Results will appear here once items are published.
                  </td>
                </tr>
              ) : (
                overallStandings.map((unit, idx) => {
                  const kidsPts = categoryPointsMap['KIDS']?.get(unit.unit) || 0;
                  const childrenPts = categoryPointsMap['CHILDREN']?.get(unit.unit) || 0;
                  const subJrPts = categoryPointsMap['SUB JUNIOR']?.get(unit.unit) || 0;
                  const juniorPts = categoryPointsMap['JUNIOR']?.get(unit.unit) || 0;
                  const teensPts = categoryPointsMap['TEENS']?.get(unit.unit) || 0;

                  const isTop3 = unit.position <= 3;
                  const rowBg =
                    unit.position === 1
                      ? 'bg-amber-50/70'
                      : unit.position === 2
                      ? 'bg-slate-100/60'
                      : unit.position === 3
                      ? 'bg-orange-50/50'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50/40';

                  return (
                    <tr key={unit.unit} className={`${rowBg} transition-colors`}>
                      <td className="py-2 px-2 text-center border-r border-slate-200 align-middle">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] leading-none whitespace-nowrap border ${getRankBadgeClass(
                            unit.position
                          )}`}
                        >
                          {unit.position}
                        </span>
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 align-middle">
                        <div className="font-bold text-[#1B254B] text-[12px] leading-tight">
                          {formatMadrasaName(unit.unit)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {unit.breakdown.length} items • Grades: A:{unit.gradeACount} B:{unit.gradeBCount} C:{unit.gradeCCount}
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                        {kidsPts > 0 ? (
                          <span className="font-bold text-slate-800">{kidsPts}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                        {childrenPts > 0 ? (
                          <span className="font-bold text-slate-800">{childrenPts}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                        {subJrPts > 0 ? (
                          <span className="font-bold text-slate-800">{subJrPts}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                        {juniorPts > 0 ? (
                          <span className="font-bold text-slate-800">{juniorPts}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                        {teensPts > 0 ? (
                          <span className="font-bold text-slate-800">{teensPts}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-amber-800 border-r border-slate-200 align-middle">
                        {unit.rank1Count || 0}
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 align-middle">
                        {unit.rank2Count || 0}
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-orange-800 border-r border-slate-200 align-middle">
                        {unit.rank3Count || 0}
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-black text-sm text-[#1B254B] bg-slate-50/80 align-middle">
                        {unit.totalPoints}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">pts</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Official Signatures Footer */}
        <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium mt-auto">
          <div>
            <p className="font-bold text-slate-800">
              Certified by Sub-District Tabulation Committee
            </p>
            <p>MSM-CIER Nilambur • Amal College of Advanced Studies, Myladi</p>
            <p className="font-mono text-[9px] text-slate-400 mt-0.5">
              Generated: {new Date().toLocaleDateString('en-GB')}{' '}
              {new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-8 text-right">
            <div className="text-center">
              <div className="w-32 h-0 border-b border-dashed border-slate-400 mb-1" />
              <p className="font-bold text-slate-800 text-[10px]">Convener</p>
              <p className="text-[9px] text-slate-400">Tabulation Desk</p>
            </div>
            <div className="text-center">
              <div className="w-32 h-0 border-b border-dashed border-slate-400 mb-1" />
              <p className="font-bold text-slate-800 text-[10px]">Chairman</p>
              <p className="text-[9px] text-slate-400">Sub-District Committee</p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGES 2+: CATEGORY-WISE MADRASA STANDINGS TABLES        */}
      {/* ======================================================== */}
      {categories.map((cat) => {
        const catStandings = standingsByCategory[cat.id] || [];

        return (
          <div
            key={cat.id}
            id={`${containerIdPrefix}-page-${cat.id}`}
            style={{
              width: '900px',
              minWidth: '900px',
              maxWidth: '900px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
            className="w-[900px] min-w-[900px] max-w-[900px] p-8 text-slate-900 bg-white font-sans mb-8 border border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#1B254B] pb-3 mb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Sargolsav Logo"
                  className="h-14 w-auto object-contain"
                />
                <div>
                  <h1 className="font-ml text-xl font-black text-[#1B254B] leading-tight">
                    നിലമ്പൂർ മണ്ഡലം സർഗോത്സവ് - 2026
                  </h1>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    MSM-CIER Kerala | Amal College, Myladi
                  </p>
                  <p className="text-[10px] font-semibold text-[#F26430]">
                    Sub-District Tabulation & Result Desk
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block border-2 border-orange-500 bg-orange-50 text-orange-950 px-3 py-1 rounded-xl font-black text-xs tracking-wider uppercase whitespace-nowrap">
                  {cat.labelEn.toUpperCase()} MADRASA POINTS
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                  Category Madrasa Standings
                </p>
              </div>
            </div>

            {/* Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  വിഭാഗം (Category):
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-ml text-lg font-black text-[#1B254B]">
                    {cat.labelMl}
                  </span>
                  <span className="text-sm font-bold text-slate-600">
                    ({cat.labelEn})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold bg-[#1B254B] text-white px-2.5 py-1 rounded-lg font-mono">
                  {catStandings.length} MADRASAS SCORED
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#1B254B] text-white uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14 font-bold border-r border-slate-700">
                      RANK
                    </th>
                    <th className="py-2.5 px-4 font-bold border-r border-slate-700">
                      MADRASA NAME
                    </th>
                    <th className="py-2.5 px-3 text-center w-24 font-bold border-r border-slate-700">
                      ITEMS SCORED
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 font-bold border-r border-slate-700">
                      A GRADE
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 font-bold border-r border-slate-700">
                      B GRADE
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 font-bold border-r border-slate-700">
                      C GRADE
                    </th>
                    <th className="py-2.5 px-3 text-center w-24 font-bold border-r border-slate-700">
                      1ST / 2ND / 3RD
                    </th>
                    <th className="py-2.5 px-4 text-right w-28 font-black bg-[#0F172A] text-amber-300">
                      POINTS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {catStandings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs">
                        No published results for {cat.labelEn} yet.
                      </td>
                    </tr>
                  ) : (
                    catStandings.map((unit, idx) => {
                      const rowBg =
                        unit.position === 1
                          ? 'bg-amber-50/70'
                          : unit.position === 2
                          ? 'bg-slate-100/60'
                          : unit.position === 3
                          ? 'bg-orange-50/50'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/40';

                      return (
                        <tr key={unit.unit} className={`${rowBg} transition-colors`}>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 align-middle">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] leading-none whitespace-nowrap border ${getRankBadgeClass(
                                unit.position
                              )}`}
                            >
                              {unit.position}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 border-r border-slate-200 align-middle">
                            <div className="font-bold text-[#1B254B] text-[13px]">
                              {formatMadrasaName(unit.unit)}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                            {unit.breakdown.length}
                          </td>

                          <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-800 border-r border-slate-200 align-middle">
                            {unit.gradeACount}
                          </td>

                          <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-800 border-r border-slate-200 align-middle">
                            {unit.gradeBCount}
                          </td>

                          <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-800 border-r border-slate-200 align-middle">
                            {unit.gradeCCount}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200 align-middle">
                            <span className="text-amber-800 font-bold">{unit.rank1Count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-700 font-bold">{unit.rank2Count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-orange-800 font-bold">{unit.rank3Count}</span>
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-[#1B254B] bg-slate-50/80 align-middle">
                            {unit.totalPoints}
                            <span className="text-[10px] font-normal text-slate-400 ml-0.5">pts</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium mt-auto">
              <div>
                <p className="font-bold text-slate-800">
                  Certified by Sub-District Tabulation Committee
                </p>
                <p>MSM-CIER Nilambur • Amal College of Advanced Studies, Myladi</p>
                <p className="font-mono text-[9px] text-slate-400 mt-0.5">
                  Generated: {new Date().toLocaleDateString('en-GB')}{' '}
                  {new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex items-center gap-8 text-right">
                <div className="text-center">
                  <div className="w-32 h-0 border-b border-dashed border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800 text-[10px]">Convener</p>
                  <p className="text-[9px] text-slate-400">Tabulation Desk</p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-0 border-b border-dashed border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800 text-[10px]">Chairman</p>
                  <p className="text-[9px] text-slate-400">Sub-District Committee</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
