import React from 'react';

export const CATEGORIES = [
  { id: 'KIDS', label: 'KIDS', color: '#F26430', bgLight: 'bg-orange-50', border: 'border-orange-200', text: 'text-[#F26430]', activeBg: 'bg-[#F26430]' },
  { id: 'CHILDREN', label: 'CHILDREN', color: '#16A34A', bgLight: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-[#16A34A]', activeBg: 'bg-[#16A34A]' },
  { id: 'SUB JUNIOR', label: 'SUB JUNIOR', color: '#2563EB', bgLight: 'bg-blue-50', border: 'border-blue-200', text: 'text-[#2563EB]', activeBg: 'bg-[#2563EB]' },
  { id: 'JUNIOR', label: 'JUNIOR', color: '#7C3AED', bgLight: 'bg-purple-50', border: 'border-purple-200', text: 'text-[#7C3AED]', activeBg: 'bg-[#7C3AED]' },
  { id: 'TEENS', label: 'TEENS', color: '#0D9488', bgLight: 'bg-teal-50', border: 'border-teal-200', text: 'text-[#0D9488]', activeBg: 'bg-[#0D9488]' },
];

export default function CategorySelector({ selectedCategory, onSelectCategory, itemCounts = {} }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap justify-start sm:justify-center">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = itemCounts[cat.id];

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shrink-0 cursor-pointer shadow-xs border ${
                isSelected
                  ? `${cat.activeBg} text-white border-transparent shadow-md scale-[1.02]`
                  : `bg-white ${cat.border} ${cat.text} hover:bg-slate-50`
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-transform ${
                  isSelected ? 'bg-white scale-110' : ''
                }`}
                style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color }}
              />
              <span>{cat.label}</span>
              {typeof count === 'number' && (
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
