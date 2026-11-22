import React from 'react';
import { computeIndividualChampionship } from '../lib/championshipEngine';
import { getPlacePoints, getGradePoints, getTotalIndividualPoints } from '../lib/tabulationEngine';
import { getCleanMadrasaName } from '../lib/madrasaHelper';

export default function IndividualChampionsPdfTemplate({
  containerIdPrefix = 'ind-champ-pdf',
  categories = [],
  items = [],
  participations = [],
  participants = [],
  madrasaUnitMap = null,
}) {
  const itemsMap = new Map();
  items.forEach((item) => itemsMap.set(String(item.code), item));

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'bg-amber-400 text-amber-950 border-amber-500';
    if (rank === 2) return 'bg-slate-300 text-slate-900 border-slate-400';
    if (rank === 3) return 'bg-[#F26430] text-white border-orange-600';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getRankLabel = (rank) => {
    if (rank === 1) return '1ST PLACE / CHAMPION';
    if (rank === 2) return '2ND PLACE';
    if (rank === 3) return '3RD PLACE';
    return `RANK ${rank}`;
  };

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
      {categories.map((cat, catIdx) => {
        const { allPerformers, qualifiedChampions } = computeIndividualChampionship(
          participations,
          participants,
          items,
          cat.id
        );

        // Top 3 highest-scoring individuals in this category
        const top3Students = allPerformers.slice(0, 3);

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
            {/* 1. Official Header */}
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
                <div className="inline-block border-2 border-amber-500 bg-amber-50 text-amber-950 px-3 py-1 rounded-xl font-black text-xs tracking-wider uppercase whitespace-nowrap">
                  🏆 TOP 3 INDIVIDUALS
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                  Official Championship Report
                </p>
              </div>
            </div>

            {/* 2. Category & Rule Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  വിഭാഗം (Category):
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-ml text-xl font-black text-[#1B254B]">
                    {cat.labelMl}
                  </span>
                  <span className="text-sm font-bold uppercase text-slate-600 font-mono">
                    ({cat.labelEn})
                  </span>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-600 max-w-sm leading-relaxed">
                <p className="font-bold text-[#1B254B]">
                  Scoring: Place (1st=5, 2nd=3, 3rd=1) + Grade (A=5, B=3, C=1) on SINGLE items
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Official Qualification: Rank 1 count &ge; 1 AND Single Points &gt; 15 (Group items tie-breaker)
                </p>
              </div>
            </div>

            {/* 3. Top 3 Individual Champions Cards */}
            <div className="space-y-4 mb-5">
              {top3Students.length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl">
                  <p className="text-xs font-semibold">No participants have scored points in this category yet.</p>
                </div>
              ) : (
                top3Students.map((student, rankIdx) => {
                  const displayRank = rankIdx + 1;
                  const isQualified = student.rank1Count >= 1 && student.singlePoints > 15;
                  const cleanMadrasa = getCleanMadrasaName(student, madrasaUnitMap);

                  // All participations for this student
                  const studentParticipations = participations.filter(
                    (p) => String(p.reg_no) === String(student.regNo)
                  );

                  return (
                    <div
                      key={student.regNo}
                      className="border border-slate-300 rounded-xl p-3 bg-white shadow-2xs space-y-2.5"
                    >
                      {/* Top Bar: Rank, Student Info, Total Points */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs border ${getRankBadgeClass(
                              displayRank
                            )} shadow-2xs whitespace-nowrap leading-none`}
                          >
                            {displayRank}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-[#1B254B] leading-snug">
                                {student.name}
                              </span>
                              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap">
                                #{student.regNo}
                              </span>
                              {isQualified ? (
                                <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                                  🏆 Officially Qualified
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap">
                                  Contender ({student.singlePoints}/16 Pts)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                              Madrasa: <span className="text-[#1B254B] uppercase">{cleanMadrasa}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-lg bg-[#1B254B] text-white font-mono font-black text-xs shadow-2xs whitespace-nowrap">
                            {student.singlePoints} Total Single Pts
                          </div>
                          {student.groupTieBreakerPoints > 0 && (
                            <p className="text-[9px] font-bold text-purple-700 mt-0.5">
                              +{student.groupTieBreakerPoints} Group Tie Pts
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Detailed Sub-Table of All Published Items for this Student */}
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
                              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200 whitespace-nowrap">
                                Item Code
                              </th>
                              <th className="py-1.5 px-2 border-r border-slate-200">
                                Item Name (Malayalam &amp; English)
                              </th>
                              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200 whitespace-nowrap">
                                Mode
                              </th>
                              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200 whitespace-nowrap">
                                Score
                              </th>
                              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200 whitespace-nowrap">
                                Grade
                              </th>
                              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200 whitespace-nowrap">
                                Rank
                              </th>
                              <th className="py-1.5 px-2 w-32 text-center whitespace-nowrap">
                                Individual Pts
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentParticipations.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-2 text-center text-slate-400 italic">
                                  No item records found.
                                </td>
                              </tr>
                            ) : (
                              studentParticipations.map((part) => {
                                const itemObj = itemsMap.get(String(part.item_code));
                                const isGroup =
                                  itemObj?.mode?.toUpperCase() === 'GROUP' ||
                                  itemObj?.type?.toUpperCase() === 'GROUP';
                                const placePts = !isGroup ? getPlacePoints(part.rank) : 0;
                                const gradePts = !isGroup ? getGradePoints(part.grade) : 0;
                                const totalIndPts = placePts + gradePts;

                                return (
                                  <tr key={part.item_code} className="hover:bg-slate-50">
                                    <td className="py-1 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                                      #{part.item_code}
                                    </td>
                                    <td className="py-1 px-2 font-medium text-slate-900 border-r border-slate-200 leading-tight">
                                      <span className="font-ml">{itemObj?.name_ml || '—'}</span>{' '}
                                      {itemObj?.name_en && (
                                        <span className="text-slate-500 text-[9px] font-sans">
                                          ({itemObj.name_en})
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                          isGroup
                                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}
                                      >
                                        {isGroup ? 'GROUP' : 'SINGLE'}
                                      </span>
                                    </td>
                                    <td className="py-1 px-2 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                      {part.total_score !== null &&
                                      part.total_score !== undefined &&
                                      part.total_score !== ''
                                        ? part.total_score
                                        : '—'}
                                    </td>
                                    <td className="py-1 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                                      {part.grade ? (
                                        <span className="inline-flex items-center justify-center leading-none font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[9px]">
                                          Grade {part.grade}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-1 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                                      {part.rank ? (
                                        <span
                                          className={`inline-flex items-center justify-center leading-none font-bold text-[9px] px-1.5 py-0.5 rounded ${
                                            part.rank === 1
                                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                              : part.rank === 2
                                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                              : 'bg-orange-100 text-orange-950 border border-orange-300'
                                          }`}
                                        >
                                          {part.rank === 1 ? '1st' : part.rank === 2 ? '2nd' : '3rd'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-1 px-2 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                                      {!isGroup ? (
                                        totalIndPts > 0 ? (
                                          <span className="text-[#1B254B]">
                                            +{totalIndPts} pts{' '}
                                            <span className="text-[8px] font-normal text-slate-500">
                                              ({placePts} pl + {gradePts} gr)
                                            </span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">0 pts</span>
                                        )
                                      ) : (
                                        <span className="text-purple-700 text-[9px]">
                                          Tie-breaker only
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 4. Official Footer */}
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
