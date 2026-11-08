import React from 'react';
import { Award, Trophy, FolderArchive } from 'lucide-react';

export default function Header({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'results', label: 'Results', icon: Award },
    { id: 'championships', label: 'Championships', icon: Trophy },
    { id: 'resources', label: 'Resources', icon: FolderArchive },
  ];

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs">
      {/* Top Festival Branding - scrolls naturally with page */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
          {/* Official Logo */}
          <div className="shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="MSM-CIER Sargolsav 2026 Logo"
              className="h-16 sm:h-20 w-auto object-contain transition-transform hover:scale-105"
            />
          </div>

          {/* Titles & Badges */}
          <div className="flex flex-col items-center sm:items-start">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-slate-100 text-[#1B254B] border border-slate-200/80 mb-1">
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
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <span>Nilambur Sub-District</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-semibold">Amal College, Myladi</span>
            </p>
          </div>
        </div>
      </div>

      {/* Slim 3-Tab Navigation Bar - sticks compactly to top when scrolling */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-100 py-2 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
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
