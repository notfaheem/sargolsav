import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import OfficialResultPdfTemplate from './OfficialResultPdfTemplate';
import { downloadResultPdf } from '../lib/pdfGenerator';
import { comparePublishedResults, getMadrasaResultPoints } from '../lib/tabulationEngine';
import { getCleanMadrasaName, fetchMadrasaUnitMap } from '../lib/madrasaHelper';
import { logAnalyticsEvent } from '../lib/analytics';
import {
  X,
  Trophy,
  Medal,
  Award,
  Clock,
  Printer,
  Download,
  Share2,
  Check,
  AlertCircle,
  Loader2,
  Users,
  User,
  Sparkles,
} from 'lucide-react';

export default function PublicResultModal({ item, isOpen, onClose }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const isPublished = Boolean(item?.is_published);

  // Fetch results strictly respecting Public Data Privacy:
  // ONLY rank, grade, points, reg_no and participant profile (name, unit, madrasa).
  // NEVER fetch judge1, judge2, judge3, total_score, percentage, chest_no!
  useEffect(() => {
    if (!isOpen || !item || !isPublished) {
      setResults([]);
      return;
    }

    async function fetchPublicItemResults() {
      setIsLoading(true);
      try {
        // Query participations including total_score for accurate score-based sorting
        const { data: participations, error: ptError } = await supabase
          .from('participations')
          .select('*')
          .eq('item_code', item.code);

        if (ptError) throw ptError;

        if (!participations || participations.length === 0) {
          setResults([]);
          return;
        }

        // Fetch participant names and units
        const regNos = participations.map((p) => p.reg_no);
        const { data: participants, error: pError } = await supabase
          .from('participants')
          .select('reg_no, name, unit, madrasa')
          .in('reg_no', regNos);

        if (pError) throw pError;

        const madrasaUnitMap = await fetchMadrasaUnitMap(supabase);

        const pMap = new Map();
        (participants || []).forEach((p) => {
          pMap.set(String(p.reg_no), p);
        });

        const isGroupItem = Boolean(
          item.mode?.toUpperCase() === 'GROUP' || item.type?.toUpperCase() === 'GROUP'
        );

        let merged = [];

        if (isGroupItem) {
          const madrasaGroups = new Map();
          participations.forEach((pt) => {
            const profile = pMap.get(String(pt.reg_no)) || {};
            const cleanMadrasa = getCleanMadrasaName(profile, madrasaUnitMap);
            const madrasaKey = cleanMadrasa;
            if (!madrasaGroups.has(madrasaKey)) {
              madrasaGroups.set(madrasaKey, []);
            }
            const rank = pt.rank ? parseInt(pt.rank, 10) : null;
            const grade = pt.grade || null;
            madrasaGroups.get(madrasaKey).push({
              reg_no: pt.reg_no,
              rank,
              grade,
              points: getMadrasaResultPoints(rank, grade),
              total_score: pt.total_score !== null && pt.total_score !== undefined && pt.total_score !== '' ? Number(pt.total_score) : null,
              judge1: pt.judge1,
              judge2: pt.judge2,
              judge3: pt.judge3,
              name: profile.name || `Participant #${pt.reg_no}`,
              unit: cleanMadrasa,
              madrasa: cleanMadrasa,
              remarks: pt.remarks || null,
            });
          });

          madrasaGroups.forEach((members, madrasaKey) => {
            members.sort((a, b) => (Number(a.reg_no) || 0) - (Number(b.reg_no) || 0));

            const savedLeaderReg = typeof window !== 'undefined'
              ? localStorage.getItem(`sargolsav_group_leader_${item.code}_${madrasaKey}`)
              : null;

            let leader = members.find((m) => m.remarks && String(m.remarks).includes('[LEADER]'));
            if (!leader && savedLeaderReg) {
              leader = members.find((m) => String(m.reg_no) === String(savedLeaderReg));
            }
            if (!leader) {
              leader = members[0];
            }

            const scoredMember = members.find(
              (m) => m.rank !== null || m.grade !== null || (m.total_score !== null && m.total_score > 0)
            ) || leader;

            merged.push({
              reg_no: leader.reg_no,
              selectedRegNo: leader.reg_no,
              rank: scoredMember.rank,
              grade: scoredMember.grade,
              points: getMadrasaResultPoints(scoredMember.rank, scoredMember.grade),
              total_score: scoredMember.total_score,
              judge1: scoredMember.judge1,
              judge2: scoredMember.judge2,
              judge3: scoredMember.judge3,
              name: leader.name,
              unit: madrasaKey,
              madrasa: madrasaKey,
              madrasaKey,
              isGroupTeam: true,
              teamSize: members.length,
              teamMembers: members,
            });
          });
        } else {
          merged = participations.map((pt) => {
            const profile = pMap.get(String(pt.reg_no)) || {};
            const cleanMadrasa = getCleanMadrasaName(profile, madrasaUnitMap);
            const rank = pt.rank ? parseInt(pt.rank, 10) : null;
            const grade = pt.grade || null;
            return {
              reg_no: pt.reg_no,
              rank,
              grade,
              points: getMadrasaResultPoints(rank, grade),
              total_score: pt.total_score !== null && pt.total_score !== undefined && pt.total_score !== '' ? Number(pt.total_score) : null,
              judge1: pt.judge1,
              judge2: pt.judge2,
              judge3: pt.judge3,
              name: profile.name || `Participant #${pt.reg_no}`,
              unit: cleanMadrasa,
              madrasa: cleanMadrasa,
            };
          });
        }

        // Include all participants who have rank, grade, OR total_score > 0 (or where judges entered marks)
        const qualified = merged.filter((r) => {
          const hasRank = r.rank !== null && r.rank !== undefined && r.rank !== '';
          const hasGrade = r.grade !== null && r.grade !== undefined && r.grade !== '';
          const hasScore = r.total_score !== null && r.total_score > 0;
          const hasJudges = (r.judge1 !== null && r.judge1 !== undefined && r.judge1 !== '') ||
                            (r.judge2 !== null && r.judge2 !== undefined && r.judge2 !== '') ||
                            (r.judge3 !== null && r.judge3 !== undefined && r.judge3 !== '');
          return hasRank || hasGrade || hasScore || hasJudges;
        });

        // Check if admin has set custom order for this item
        const savedOrderJson = typeof window !== 'undefined' ? localStorage.getItem(`sargolsav_order_${item.code}`) : null;
        let orderMap = null;
        if (savedOrderJson) {
          try {
            const parsedOrder = JSON.parse(savedOrderJson);
            orderMap = new Map();
            parsedOrder.forEach((reg, idx) => orderMap.set(String(reg), idx));
          } catch (e) {}
        }

        // Sort: Admin custom order -> Rank (1, 2, 3) -> Total Score descending -> Points descending -> Grade -> Reg No
        qualified.sort((a, b) => {
          if (orderMap) {
            const aKey = a.madrasaKey || String(a.reg_no);
            const bKey = b.madrasaKey || String(b.reg_no);
            const hasA = orderMap.has(aKey) || orderMap.has(String(a.reg_no));
            const hasB = orderMap.has(bKey) || orderMap.has(String(b.reg_no));
            if (hasA && hasB) {
              const idxA = orderMap.has(aKey) ? orderMap.get(aKey) : orderMap.get(String(a.reg_no));
              const idxB = orderMap.has(bKey) ? orderMap.get(bKey) : orderMap.get(String(b.reg_no));
              if (idxA !== idxB) return idxA - idxB;
            }
          }
          return comparePublishedResults(a, b);
        });

        setResults(qualified);
      } catch (err) {
        console.error('Error fetching public item results:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublicItemResults();
  }, [isOpen, item, isPublished]);

  // Top Winners (Ranks 1, 2, 3) with tie support
  const rank1Winners = useMemo(() => results.filter((r) => r.rank === 1), [results]);
  const rank2Winners = useMemo(() => results.filter((r) => r.rank === 2), [results]);
  const rank3Winners = useMemo(() => results.filter((r) => r.rank === 3), [results]);

  const hasAnyRank = rank1Winners.length > 0 || rank2Winners.length > 0 || rank3Winners.length > 0;

  if (!isOpen || !item) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export Handler
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !item) return;
    setIsDownloadingPdf(true);

    // Silently log PDF export event
    logAnalyticsEvent({
      event_type: 'pdf_download',
      item_code: item.code,
      item_name: item.name_en || item.name_ml,
      category: item.category,
    });

    try {
      await downloadResultPdf(`public-result-pdf-${item.code}`, item.code);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // WhatsApp / Clipboard Share Handler
  const handleShare = () => {
    const title = `*MSM-CIER Sargolsav 2026 - Nilambur Sub-District*\n*Result: #${item.code} - ${item.name_ml} (${item.name_en})*\nCategory: ${item.category} | Mode: ${item.mode}\n\n`;

    let winnersText = '';
    if (rank1Winners.length > 0) {
      winnersText += `🥇 *First Place:* ${rank1Winners.map((w) => `${w.name} [Madrasa: ${w.unit}] [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }
    if (rank2Winners.length > 0) {
      winnersText += `🥈 *Second Place:* ${rank2Winners.map((w) => `${w.name} [Madrasa: ${w.unit}] [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }
    if (rank3Winners.length > 0) {
      winnersText += `🥉 *Third Place:* ${rank3Winners.map((w) => `${w.name} [Madrasa: ${w.unit}] [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }

    const footer = `\nView full live results at: ${window.location.origin}`;
    const fullText = title + winnersText + footer;

    // Check if on mobile for native share, otherwise copy
    if (navigator.share) {
      navigator.share({
        title: `Sargolsav 2026 Result #${item.code}`,
        text: fullText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      });
    }
  };

  const getRankText = (rank) => {
    if (rank === 1) return 'FIRST';
    if (rank === 2) return 'SECOND';
    if (rank === 3) return 'THIRD';
    return '-';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:shadow-none print:border-none print:max-h-none print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#1B254B] text-white flex items-center justify-between gap-3 shrink-0 print:bg-transparent print:text-black print:border-b-2 print:border-slate-800 print:px-0">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#F26430] text-white">
                #{item.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/15 text-slate-100">
                {item.category}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-white/10 text-slate-200">
                {item.mode}
              </span>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Official Result
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Awaiting Result
                </span>
              )}
            </div>

            {/* Malayalam Name */}
            <h2 className="font-ml text-xl sm:text-2xl font-bold text-white print:text-black leading-snug truncate">
              {item.name_ml}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 print:text-slate-600 font-medium truncate">
              {item.name_en}
            </p>
          </div>

          {/* Action buttons (Print, Share, Close) - Hidden in Print */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 print:hidden">
            {isPublished && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F26430] hover:bg-[#d95322] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Download Official Result PDF"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                  title="Share Result on WhatsApp or Copy"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#F26430]" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                  title="Print Result PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-200" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 print:p-0 print:space-y-4 print:overflow-visible">
          {/* A. If Item is UNPUBLISHED */}
          {!isPublished ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                <Clock className="w-8 h-8 animate-pulse text-amber-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1B254B]">
                Result Not Announced Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                The results for this item have not been published yet. Please check back later!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#F26430]" />
              <p className="text-xs font-semibold">Loading official result sheet...</p>
            </div>
          ) : (
            <>
              {/* B. Section A: Top Winners Highlight Cards (1st, 2nd, 3rd) */}
              {hasAnyRank && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-[#F26430]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Position Holders
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Rank 1 (Gold) */}
                    {rank1Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-sm shadow-xs shrink-0">
                            1
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-200 text-amber-900">
                            FIRST PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-amber-950 leading-snug">
                            {winner.name}
                            {winner.isGroupTeam && (
                              <span className="text-xs font-semibold text-amber-900 ml-1.5 align-middle">
                                & Team ({winner.teamSize})
                              </span>
                            )}
                          </h4>
                          <p className="text-xs font-semibold text-amber-800 mt-0.5 truncate">
                            Madrasa: {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-amber-700/80 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md">
                            {winner.points > 0 ? `+${winner.points} pts` : '0 pts'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Rank 2 (Silver) */}
                    {rank2Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-slate-50/95 border-2 border-slate-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm shadow-xs shrink-0">
                            2
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-slate-200 text-slate-800">
                            SECOND PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                            {winner.name}
                            {winner.isGroupTeam && (
                              <span className="text-xs font-semibold text-slate-700 ml-1.5 align-middle">
                                & Team ({winner.teamSize})
                              </span>
                            )}
                          </h4>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                            Madrasa: {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            {winner.points > 0 ? `+${winner.points} pts` : '0 pts'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Rank 3 (Bronze) */}
                    {rank3Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-orange-50/90 border-2 border-orange-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F26430] text-white font-black text-sm shadow-xs shrink-0">
                            3
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-orange-200 text-orange-900">
                            THIRD PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-orange-950 leading-snug">
                            {winner.name}
                            {winner.isGroupTeam && (
                              <span className="text-xs font-semibold text-orange-900 ml-1.5 align-middle">
                                & Team ({winner.teamSize})
                              </span>
                            )}
                          </h4>
                          <p className="text-xs font-semibold text-orange-800 mt-0.5 truncate">
                            Madrasa: {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-orange-700/80 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-orange-200/80 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-orange-950 bg-orange-200/70 px-2 py-0.5 rounded-md">
                            {winner.points > 0 ? `+${winner.points} pts` : '0 pts'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Section B: Complete Official Result Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Official Consolidated Results ({results.length} Awardees)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 print:hidden">
                    All Contestants & Awardees
                  </span>
                </div>

                {results.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold">No participants recorded for this item yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 print:border-slate-800 print:rounded-none">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-[#1B254B] text-white font-bold uppercase tracking-wider text-[10px] print:bg-slate-200 print:text-black">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">SL NO</th>
                          <th className="py-2.5 px-3 w-20">REG NO</th>
                          <th className="py-2.5 px-4">NAME</th>
                          <th className="py-2.5 px-4">MADRASA</th>
                          <th className="py-2.5 px-3 text-center w-20">GRADE</th>
                          <th className="py-2.5 px-3 text-center w-24">RANK</th>
                          <th className="py-2.5 px-3 text-center w-20">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                        {results.map((row, idx) => (
                          <tr
                            key={row.reg_no}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.rank === 1
                                ? 'bg-amber-50/40 print:bg-transparent font-medium'
                                : row.rank === 2
                                ? 'bg-slate-50/60 print:bg-transparent font-medium'
                                : row.rank === 3
                                ? 'bg-orange-50/30 print:bg-transparent font-medium'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1B254B] whitespace-nowrap">
                              #{row.reg_no}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-[#1B254B]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{row.name}</span>
                                {row.isGroupTeam && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md cursor-help"
                                    title={row.teamMembers?.map((m) => `#${m.reg_no} ${m.name}`).join('\n')}
                                  >
                                    👥 Team of {row.teamSize}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-semibold whitespace-nowrap">
                              {row.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.grade ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-black ${
                                    row.grade === 'A'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : row.grade === 'B'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  Grade {row.grade}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {row.rank ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    row.rank === 1
                                      ? 'bg-amber-400 text-amber-950'
                                      : row.rank === 2
                                      ? 'bg-slate-300 text-slate-800'
                                      : 'bg-[#F26430] text-white'
                                  }`}
                                >
                                  {getRankText(row.rank)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-[#1B254B]">
                              {row.points > 0 ? `+${row.points}` : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium print:hidden">
          <span>Nilambur Sub-District • Amal College, Myladi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
          >
            Close Sheet
          </button>
        </div>
      </div>

      {/* Off-screen high-res template for PDF generation */}
      {isPublished && (
        <OfficialResultPdfTemplate
          containerId={`public-result-pdf-${item.code}`}
          item={item}
          results={results}
        />
      )}
    </div>
  );
}
