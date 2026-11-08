import React from 'react';
import { CheckCircle2, Clock, Users, User, ChevronRight } from 'lucide-react';

export default function ItemCard({ item, onClick }) {
  const isPublished = Boolean(item.is_published);
  const isGroup = item.mode?.toUpperCase() === 'GROUP';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(item)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#F26430]/70 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
    >
      <div>
        {/* Top Header: Code badge and Mode tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-slate-100 text-[#1B254B] border border-slate-200 group-hover:bg-[#1B254B] group-hover:text-white transition-colors">
            #{item.code}
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase ${
              isGroup
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {isGroup ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            <span>{item.mode || 'SINGLE'}</span>
          </span>
        </div>

        {/* Malayalam Name */}
        <h3 className="font-ml font-bold text-lg sm:text-xl text-[#1B254B] group-hover:text-[#F26430] leading-snug tracking-normal mb-1.5 break-words transition-colors">
          {item.name_ml}
        </h3>

        {/* English Name */}
        <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed mb-4">
          {item.name_en}
        </p>
      </div>

      {/* Footer: Result Status Pill */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        {isPublished ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Result Published</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Awaiting Result</span>
          </span>
        )}

        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-[#F26430] transition-colors">
          <span className="uppercase tracking-wider">{item.category}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}
