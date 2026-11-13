import React from 'react';
import { Megaphone } from 'lucide-react';

export default function AnnouncementBar({ text, show }) {
  if (!show || !text || text.trim() === '') {
    return null;
  }

  const cleanText = text.trim();

  return (
    <aside
      aria-label="Festival Announcement"
      className="bg-[#1B254B] text-white py-2 px-3 sm:px-4 shadow-sm border-b border-navy-800 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto flex items-center gap-2.5">
        {/* Fixed Megaphone Badge on the left */}
        <div className="flex items-center gap-1.5 shrink-0 bg-[#1B254B] z-10 pr-2">
          <span className="p-1 rounded-full bg-[#F26430]/20 text-[#F26430] shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-[#F26430] animate-pulse" />
          </span>
          <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-[#F26430] text-white px-1.5 py-0.5 rounded shadow-2xs">
            Notice
          </span>
        </div>

        {/* Scrolling Marquee Container with pause on hover/touch */}
        <div
          className="overflow-hidden w-full relative flex items-center group cursor-default"
          title={cleanText}
        >
          <div className="announcement-marquee text-xs sm:text-sm font-medium text-slate-100 tracking-wide font-ml">
            {cleanText}
          </div>
        </div>
      </div>
    </aside>
  );
}
