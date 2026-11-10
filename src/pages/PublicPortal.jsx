import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AnnouncementBar from '../components/AnnouncementBar';
import Header from '../components/Header';
import CategorySelector, { CATEGORIES } from '../components/CategorySelector';
import ItemCard from '../components/ItemCard';
import RecentResultsStrip from '../components/RecentResultsStrip';
import PublicResultModal from '../components/PublicResultModal';
import GlobalSearchPanel from '../components/GlobalSearchPanel';
import ChampionshipsTab from '../components/ChampionshipsTab';
import PublicResourcesTab from '../components/PublicResourcesTab';
import DeveloperFooter from '../components/DeveloperFooter';
import { Search, Trophy, FolderArchive, RefreshCw, AlertCircle, Layers } from 'lucide-react';

export default function PublicPortal() {
  const [activeTab, setActiveTab] = useState('results');
  const [selectedCategory, setSelectedCategory] = useState('KIDS');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for Result View Modal (published result or awaiting notice)
  const [selectedModalItem, setSelectedModalItem] = useState(null);

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

  // Track Public Visits (Total Views & Live Presence)
  useEffect(() => {
    // 1. Total Views Increment once per browser session
    const hasViewed = sessionStorage.getItem('sargolsav_viewed');
    if (!hasViewed) {
      async function trackTotalView() {
        try {
          // Attempt RPC first
          const { error: rpcErr } = await supabase.rpc('increment_total_views');
          if (rpcErr) {
            // Fallback: direct read & increment on settings
            const { data: sData } = await supabase
              .from('settings')
              .select('total_views')
              .eq('id', 1)
              .single();
            const currentViews = Number(sData?.total_views) || 0;
            await supabase
              .from('settings')
              .update({ total_views: currentViews + 1 })
              .eq('id', 1);
          }
          sessionStorage.setItem('sargolsav_viewed', '1');
        } catch (e) {
          console.warn('View tracking notice:', e);
        }
      }
      trackTotalView();
    }

    // 2. Realtime Presence for Live Visitors
    const channel = supabase.channel('online-visitors');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Published items list
  const publishedItems = useMemo(() => {
    return items.filter((i) => i.is_published);
  }, [items]);

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

  // Filter items for selected category when no global search is active
  const filteredCategoryItems = useMemo(() => {
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

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
            {/* Global Search Bar */}
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
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {!searchQuery && (
                <p className="mt-1.5 text-[11px] text-center text-slate-400 font-medium">
                  Instant search: Type a student Reg No, name, or unit to view individual points & result sheets.
                </p>
              )}
            </div>

            {/* Instant Global Search View OR Standard Category/Item Browser */}
            {searchQuery.trim() ? (
              /* Global Search Active */
              <GlobalSearchPanel
                query={searchQuery}
                onClear={() => setSearchQuery('')}
                allItems={items}
                onOpenItemResult={(item) => setSelectedModalItem(item)}
              />
            ) : (
              /* Standard Category & Item Browser */
              <div className="space-y-6">
                {/* 🔥 Recently Published Results Ticker / Strip */}
                {publishedItems.length > 0 && (
                  <RecentResultsStrip
                    publishedItems={publishedItems}
                    onSelectItem={(item) => setSelectedModalItem(item)}
                  />
                )}

                {/* Category Selector Pills */}
                <div className="pt-1">
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
                ) : filteredCategoryItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-[#1B254B]">No items found</h4>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                      No items registered in the {selectedCategory} category yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {filteredCategoryItems.map((item) => (
                      <ItemCard
                        key={item.code}
                        item={item}
                        onClick={(clickedItem) => setSelectedModalItem(clickedItem)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Championships & Podiums Tab */}
        {activeTab === 'championships' && <ChampionshipsTab />}

        {/* Resources Tab */}
        {activeTab === 'resources' && <PublicResourcesTab />}
      </main>

      {/* Public Item Result View Modal */}
      {selectedModalItem && (
        <PublicResultModal
          item={selectedModalItem}
          isOpen={Boolean(selectedModalItem)}
          onClose={() => setSelectedModalItem(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 px-4 print:hidden">
        <div className="max-w-6xl mx-auto space-y-3">
          <DeveloperFooter />
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Venue: Amal College of Advanced Studies, Myladi, Nilambur
          </p>
        </div>
      </footer>
    </div>
  );
}
