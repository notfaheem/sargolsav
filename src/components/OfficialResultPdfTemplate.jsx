import React from 'react';

export default function OfficialResultPdfTemplate({ containerId, item, results = [] }) {
  if (!item) return null;

  const getRankText = (rank) => {
    if (rank === 1) return 'FIRST';
    if (rank === 2) return 'SECOND';
    if (rank === 3) return 'THIRD';
    return '';
  };

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
      {/* 1. Official Header */}
      <div className="flex items-center justify-between border-b-2 border-[#1B254B] pb-4 mb-4">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
          <div>
            <h1 className="font-ml text-2xl font-black text-[#1B254B] leading-tight">
              നിലമ്പൂർ മണ്ഡലം സർഗോത്സവ് - 2026
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
              MSM-CIER Kerala | Amal College, Myladi
            </p>
            <p className="text-[11px] font-semibold text-[#F26430]">
              Sub-District Tabulation & Result Desk
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block border-2 border-[#16A34A] bg-emerald-50 text-[#16A34A] px-4 py-1.5 rounded-xl font-black text-sm tracking-widest uppercase">
            RESULT
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Official Publication
          </p>
        </div>
      </div>

      {/* 2. Metadata Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-slate-500 mr-1.5">ഇനം (Item):</span>
          <span className="font-mono font-bold bg-[#1B254B] text-white px-2 py-0.5 rounded mr-2">
            #{item.code}
          </span>
          <span className="font-ml font-bold text-sm text-[#1B254B]">
            {item.name_ml}
          </span>
          <span className="text-slate-500 font-medium ml-1.5">
            ({item.name_en})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="font-bold text-slate-500 mr-1">വിഭാഗം:</span>
            <span className="font-bold text-[#F26430] uppercase">
              {item.category}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="font-bold text-slate-500 mr-1">തരം:</span>
            <span className="font-bold text-slate-700 uppercase">
              {item.mode}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Official Result Table */}
      <table className="w-full text-xs text-left border-collapse border border-slate-300">
        <thead>
          <tr className="bg-[#1B254B] text-white font-bold uppercase text-[10px] tracking-wider">
            <th className="border border-slate-400 py-2.5 px-3 text-center w-12">
              SL NO
            </th>
            <th className="border border-slate-400 py-2.5 px-3 w-20 text-center font-mono">
              Reg NO
            </th>
            <th className="border border-slate-400 py-2.5 px-3">
              Name
            </th>
            <th className="border border-slate-400 py-2.5 px-3">
              Unit
            </th>
            <th className="border border-slate-400 py-2.5 px-3 text-center w-16">
              GRADE
            </th>
            <th className="border border-slate-400 py-2.5 px-3 text-center w-24">
              RANK
            </th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="border border-slate-300 py-8 text-center text-slate-500 italic"
              >
                No awardees recorded for this item.
              </td>
            </tr>
          ) : (
            results.map((row, idx) => (
              <tr
                key={row.reg_no}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
              >
                <td className="border border-slate-300 py-2 px-3 text-center font-mono font-semibold text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-center font-mono font-bold text-[#1B254B]">
                  #{row.reg_no}
                </td>
                <td className="border border-slate-300 py-2 px-3 font-bold text-[#1B254B]">
                  {row.name}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-slate-700 font-semibold">
                  {row.unit}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-center font-bold">
                  {row.grade ? `Grade ${row.grade}` : '-'}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-center font-black">
                  {getRankText(row.rank) ? (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                        row.rank === 1
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : row.rank === 2
                          ? 'bg-slate-200 text-slate-900 border border-slate-300'
                          : 'bg-orange-100 text-orange-950 border border-orange-300'
                      }`}
                    >
                      {getRankText(row.rank)}
                    </span>
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 4. Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <div>
          <p className="font-bold text-slate-700">
            Certified by Sub-District Tabulation Committee
          </p>
          <p>MSM-CIER Nilambur • Amal College of Advanced Studies, Myladi</p>
        </div>
        <div className="text-right">
          <p>Official Sargolsav 2026 Portal</p>
          <p className="font-mono">{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}
