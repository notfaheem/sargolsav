import React from 'react';
import { Megaphone } from 'lucide-react';

export default function AnnouncementBar({ text, show }) {
  if (!show || !text || text.trim() === '') {
    return null;
  }

  return (
    <aside 
      aria-label="Festival Announcement"
      className="bg-[#1B254B] text-white py-2 px-4 shadow-sm border-b border-navy-800"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium tracking-wide">
        <span className="p-1 rounded-full bg-coral-500/20 text-coral-500 shrink-0">
          <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F26430] animate-pulse" />
        </span>
        <span className="text-slate-100 text-center leading-snug">
          {text}
        </span>
      </div>
    </aside>
  );
}
