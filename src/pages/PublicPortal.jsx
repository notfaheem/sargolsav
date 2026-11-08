import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AnnouncementBar from '../components/AnnouncementBar';
import Header from '../components/Header';
import CategorySelector, { CATEGORIES } from '../components/CategorySelector';
import ItemCard from '../components/ItemCard';
import { Search, Trophy, FolderArchive, RefreshCw, AlertCircle, Layers } from 'lucide-react';

export default function PublicPortal() {
  const [activeTab, setActiveTab] = useState('results');
  const [selectedCategory, setSelectedCategory] = useState('KIDS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Public settings state (strictly only announcement_text and show_announcement)
  const [settings, setSettings] = useState({
    announcement_text: '',
    show_announcement: false,
  });

  // Items state
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState(null);

  // Fetch public settings - strictly selecting only announcement fields for privacy
  useEffect(() => {
    async function fetchPublicSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('announcement_text, show_announcement')
          .eq('id', 1)
          .single();

        if (error) {
          console.warn('Error fetching announcement settings:', error.message);
          return;
        }

        if (data) {
          setSettings({
            announcement_text: data.announcement_text || '',
            show_announcement: Boolean(data.show_announcement),
          });
        }
      } catch (err) {
        console.warn('Error in fetchPublicSettings:', err);
      }
    }

    fetchPublicSettings();
  }, []);

  // Fetch items - strictly public columns, sorted by code
  const fetchItems = useCallback(async () => {
    setIsLoadingItems(true);
    setItemsError(null);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('code, name_ml, name_en, category, mode, is_published, published_at')
        .order('code', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setItemsError('Unable to load festival items. Please check network connection.');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = 0;
    }
    for (const item of items) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [items]);

  // Zero double-click bug handler: pass selected category directly
  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Filter items for selected category and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      const matchesCategory = item.category === selectedCategory;
      if (!matchesCategory) return false;

      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const codeStr = String(item.code);
      const nameEn = (item.name_en || '').toLowerCase();
      const nameMl = (item.name_ml || '').toLowerCase();

      return codeStr.includes(q) || nameEn.includes(q) || nameMl.includes(q);
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* 1. Top Announcement Bar */}
      <AnnouncementBar
        text={settings.announcement_text}
        show={settings.show_announcement}
      />

      {/* 2. Header with Navigation */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Global Search Bar (UI ready for Phase 4 wiring) */}
            <div className="relative max-w-2xl mx-auto">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Reg No, Participant Name, or Unit..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base text-[#1B254B] placeholder:text-slate-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#F26430] focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-center text-slate-400 font-medium">
                Tip: Search items, codes, or browse categories below. Participant lookup will activate in Phase 4.
              </p>
            </div>

            {/* Category Selector Pills */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                    Categories
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {categoryCounts[selectedCategory] || 0} Items in {selectedCategory}
                </span>
              </div>

              <CategorySelector
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                itemCounts={categoryCounts}
              />
            </div>

            {/* Error state */}
            {itemsError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm font-medium">{itemsError}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchItems}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-300 rounded-lg text-red-700 hover:bg-red-100 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            )}

            {/* Items Grid */}
            {isLoadingItems ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-14 bg-slate-200 rounded-lg"></div>
                      <div className="h-5 w-16 bg-slate-100 rounded-md"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div className="h-5 w-24 bg-slate-100 rounded-full"></div>
                      <div className="h-4 w-12 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#1B254B]">No items found</h4>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No items match "${searchQuery}" in category ${selectedCategory}. Try another search term.`
                    : `No items found for the ${selectedCategory} category.`}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-[#1B254B] hover:bg-slate-200"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredItems.map((item) => (
                  <ItemCard key={item.code} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Championships Tab (Placeholder for Phase 5) */}
        {activeTab === 'championships' && (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B254B]">
              Championship Standings
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Overall Unit Championship, Zone Trophies, and Category-wise point tables will be wired and updated live in Phase 5.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
              >
                ← Back to Results
              </button>
            </div>
          </div>
        )}

        {/* Resources Tab (Placeholder for Phase 6) */}
        {activeTab === 'resources' && (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center shadow-xs">
              <FolderArchive className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B254B]">
              Festival Resources & Guidelines
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Program schedule, rules manual, score sheet templates, and venue maps will be wired in Phase 6.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
              >
                ← Back to Results
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <p>© 2026 MSM-CIER Nilambur Sub-District. All Rights Reserved.</p>
          <p>Venue: Amal College of Advanced Studies, Myladi, Nilambur</p>
        </div>
      </footer>
    </div>
  );
}
