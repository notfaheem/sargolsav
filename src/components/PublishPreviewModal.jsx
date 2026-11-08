import React, { useState } from 'react';
import { X, Award, CheckCircle2, AlertCircle, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function PublishPreviewModal({
  isOpen,
  onClose,
  item,
  rows,
  onConfirmPublish,
  isPublishing,
}) {
  // Allow admin overrides
  const [overrides, setOverrides] = useState({});

  if (!isOpen || !item) return null;

  // Apply overrides to rows for preview
  const previewRows = rows.map((r) => {
    const o = overrides[r.reg_no] || {};
    return {
      ...r,
      grade: o.grade !== undefined ? o.grade : r.grade,
      rank: o.rank !== undefined ? o.rank : r.rank,
      points: o.points !== undefined ? o.points : r.points,
    };
  });

  // Filter scored and ranked winners
  const rank1 = previewRows.filter((r) => String(r.rank) === '1');
  const rank2 = previewRows.filter((r) => String(r.rank) === '2');
  const rank3 = previewRows.filter((r) => String(r.rank) === '3');
  const gradeHolders = previewRows.filter((r) => r.grade && !r.rank);

  const handleOverrideChange = (regNo, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [regNo]: {
        ...(prev[regNo] || {}),
        [field]: value === 'null' || value === '' ? null : (field === 'points' || field === 'rank' ? (isNaN(parseInt(value, 10)) ? null : parseInt(value, 10)) : value),
      },
    }));
  };

  const handleConfirm = () => {
    onConfirmPublish(previewRows);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1B254B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-[#F26430]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Result Verification & Override Preview
              </h3>
              <p className="text-xs text-slate-300">
                Item #{item.code}: {item.name_ml} ({item.name_en}) • {item.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Winners Spotlight */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Official Position Holders (Rank 1, 2, 3)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rank 1 */}
              <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 text-center shadow-xs">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-sm mb-2 shadow-xs">
                  1
                </span>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">First Place</p>
                {rank1.length === 0 ? (
                  <p className="text-xs text-slate-400 italic mt-1">No Rank 1</p>
                ) : (
                  rank1.map((w) => (
                    <div key={w.reg_no} className="mt-1">
                      <p className="text-sm font-bold text-[#1B254B] truncate">{w.name}</p>
                      <p className="text-xs text-slate-500">{w.unit} • #{w.reg_no}</p>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold">
                        <span className="px-2 py-0.2 rounded bg-amber-200 text-amber-900">Score: {w.total_score}</span>
                        {w.grade && <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-800">Grade {w.grade}</span>}
                        <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-800">{w.points} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Rank 2 */}
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-4 text-center shadow-xs">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm mb-2 shadow-xs">
                  2
                </span>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Second Place</p>
                {rank2.length === 0 ? (
                  <p className="text-xs text-slate-400 italic mt-1">No Rank 2</p>
                ) : (
                  rank2.map((w) => (
                    <div key={w.reg_no} className="mt-1">
                      <p className="text-sm font-bold text-[#1B254B] truncate">{w.name}</p>
                      <p className="text-xs text-slate-500">{w.unit} • #{w.reg_no}</p>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold">
                        <span className="px-2 py-0.2 rounded bg-slate-200 text-slate-800">Score: {w.total_score}</span>
                        {w.grade && <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-800">Grade {w.grade}</span>}
                        <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-800">{w.points} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Rank 3 */}
              <div className="bg-orange-50/80 border border-orange-300 rounded-2xl p-4 text-center shadow-xs">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F26430] text-white font-black text-sm mb-2 shadow-xs">
                  3
                </span>
                <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">Third Place</p>
                {rank3.length === 0 ? (
                  <p className="text-xs text-slate-400 italic mt-1">No Rank 3</p>
                ) : (
                  rank3.map((w) => (
                    <div key={w.reg_no} className="mt-1">
                      <p className="text-sm font-bold text-[#1B254B] truncate">{w.name}</p>
                      <p className="text-xs text-slate-500">{w.unit} • #{w.reg_no}</p>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold">
                        <span className="px-2 py-0.2 rounded bg-orange-100 text-orange-900">Score: {w.total_score}</span>
                        {w.grade && <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-800">Grade {w.grade}</span>}
                        <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-800">{w.points} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Verification & Manual Override Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contestants Table (With Appeal / Manual Override Controls)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                You can manually adjust Rank, Grade, or Points if ordered by judges.
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Name & Unit</th>
                    <th className="py-2.5 px-3">Total Score</th>
                    <th className="py-2.5 px-3">Grade (Override)</th>
                    <th className="py-2.5 px-3">Rank (Override)</th>
                    <th className="py-2.5 px-3">Points (Override)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row) => (
                    <tr key={row.reg_no} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[#1B254B]">
                        #{row.reg_no}
                      </td>
                      <td className="py-2 px-3">
                        <p className="font-bold text-[#1B254B]">{row.name}</p>
                        <p className="text-[11px] text-slate-500">{row.unit}</p>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {row.isAbsent ? (
                          <span className="text-slate-400 italic">Absent</span>
                        ) : (
                          <span>{row.total_score} ({row.percentage}%)</span>
                        )}
                      </td>

                      {/* Grade Override Dropdown */}
                      <td className="py-2 px-3">
                        <select
                          value={row.grade || 'null'}
                          onChange={(e) => handleOverrideChange(row.reg_no, 'grade', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1B254B]"
                        >
                          <option value="null">None (-)</option>
                          <option value="A">Grade A</option>
                          <option value="B">Grade B</option>
                          <option value="C">Grade C</option>
                        </select>
                      </td>

                      {/* Rank Override Dropdown */}
                      <td className="py-2 px-3">
                        <select
                          value={row.rank || 'null'}
                          onChange={(e) => handleOverrideChange(row.reg_no, 'rank', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-[#1B254B]"
                        >
                          <option value="null">No Rank (-)</option>
                          <option value="1">Rank 1</option>
                          <option value="2">Rank 2</option>
                          <option value="3">Rank 3</option>
                        </select>
                      </td>

                      {/* Points Override Input */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={row.points ?? 0}
                          onChange={(e) => handleOverrideChange(row.reg_no, 'points', e.target.value)}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#1B254B]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Publishing will make this result immediately visible to the public on the portal.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Live Result...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🚀 Confirm & Publish Live</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
