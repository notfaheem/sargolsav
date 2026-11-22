import React from 'react';
import { getCleanMadrasaName } from '../lib/madrasaHelper';

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
        width: '900px',
        minWidth: '900px',
        maxWidth: '900px',
        backgroundColor: '#ffffff',
        zIndex: -9999,
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
      className="w-[900px] min-w-[900px] max-w-[900px] p-8 text-[#1B254B] bg-white font-sans"
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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ഇനം (Item):
            </span>
            <span className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 text-white font-bold rounded-md whitespace-nowrap leading-none align-middle font-mono text-sm">
              #{item.code}
            </span>
          </div>

          <div className="text-2xl md:text-3xl font-black text-slate-950 mt-1 leading-snug">
            <span className="font-ml">{item.name_ml}</span>
            {item.name_en && (
              <span className="text-slate-600 font-bold text-xl md:text-2xl ml-2 font-sans">
                ({item.name_en})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-slate-600">വിഭാഗം:</span>
            <span className="text-2xl font-black uppercase text-slate-900 tracking-wide">
              {item.category}
            </span>
          </div>
          <span className="text-slate-300 text-lg">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-slate-600">തരം:</span>
            <span className="text-base font-bold text-slate-700 uppercase">
              {item.mode}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Official Result Table */}
      <table className="w-full text-xs text-left border-collapse border border-slate-300">
        <thead>
          <tr className="bg-[#1B254B] text-white font-bold uppercase text-[10px] tracking-wider">
            <th className="border border-slate-400 py-3 px-3 text-center w-12 whitespace-nowrap">
              SL NO
            </th>
            <th className="border border-slate-400 py-3 px-3 w-20 text-center font-mono whitespace-nowrap">
              REG NO
            </th>
            <th className="border border-slate-400 py-3 px-3 text-left">
              NAME
            </th>
            <th className="border border-slate-400 py-3 px-3 text-left">
              MADRASA
            </th>
            <th className="border border-slate-400 py-3 px-3 text-center w-20 whitespace-nowrap">
              GRADE
            </th>
            <th className="border border-slate-400 py-3 px-3 text-center w-28 whitespace-nowrap">
              RANK
            </th>
            <th className="border border-slate-400 px-4 py-3 text-center w-24 whitespace-nowrap">
              SIGN
            </th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="border border-slate-300 py-8 text-center text-slate-500 italic"
              >
                No participants recorded for this item.
              </td>
            </tr>
          ) : (
            results.map((row, idx) => (
              <tr
                key={row.reg_no}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
              >
                <td className="border border-slate-300 py-3 px-3 text-center font-mono font-semibold text-slate-600 whitespace-nowrap">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 py-3 px-3 text-center font-mono font-bold text-[#1B254B] whitespace-nowrap">
                  #{row.reg_no}
                </td>
                <td className="border border-slate-300 py-3 px-3 text-left font-bold text-[#1B254B] leading-relaxed">
                  {row.name}
                  {(row.isGroupTeam || item.mode === 'GROUP' || item.type === 'GROUP') && (
                    <span className="font-normal text-slate-500 ml-1.5 text-[10px]">
                      & Team
                    </span>
                  )}
                </td>
                <td className="border border-slate-300 py-3 px-3 text-left text-slate-700 font-semibold leading-relaxed">
                  {getCleanMadrasaName(row)}
                </td>
                <td className="border border-slate-300 py-3 px-3 text-center font-bold whitespace-nowrap">
                  {row.grade ? `Grade ${row.grade}` : '-'}
                </td>
                <td className="border border-slate-300 py-3 px-3 text-center font-black whitespace-nowrap">
                  {getRankText(row.rank) ? (
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-black ${
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
                    <span className="text-slate-400 font-normal">-</span>
                  )}
                </td>
                <td className="border border-slate-300 px-4 py-3 align-middle text-center whitespace-nowrap">
                  <div className="w-12 h-0 border-b border-dashed border-gray-400 mx-auto" />
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
