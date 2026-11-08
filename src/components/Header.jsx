import React from 'react';
import { Award, Trophy, FolderArchive } from 'lucide-react';

export default function Header({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'results', label: 'Results', icon: Award },
    { id: 'championships', label: 'Championships', icon: Trophy },
    { id: 'resources', label: 'Resources', icon: FolderArchive },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Festival Branding */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-3">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-slate-100 text-[#1B254B] border border-slate-200/80 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F26430]"></span>
            <span>MSM-CIER Kerala</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">Markazudawa</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#1B254B] font-sans">
            SARGOLSAV <span className="text-[#F26430]">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
            <span>Nilambur Sub-District</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-semibold">Amal College, Myladi</span>
          </p>
        </div>

        {/* 3-Tab Navigation Bar */}
        <div className="mt-5 flex justify-center border-t border-slate-100 pt-1">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1B254B] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#1B254B] hover:bg-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F26430]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
