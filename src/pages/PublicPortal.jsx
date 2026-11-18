import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import GlobalAnnouncementModal from '../components/GlobalAnnouncementModal';
import { Search, Trophy, FolderArchive, RefreshCw, AlertCircle, Layers, Clock, Eye } from 'lucide-react';

export default function PublicPortal() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('results');
  const [selectedCategory, setSelectedCategory] = useState('KIDS');
  const [showPublishedOnly, setShowPublishedOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('q') || searchParams.get('reg') || searchParams.get('search') || '';
  });

  // Handle URL search queries (e.g. from QR codes or direct links)
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('reg') || searchParams.get('search');
    if (q) {
      setSearchQuery(q);
      setActiveTab('results');
    }
  }, [searchParams]);

  // Selected item for Result View Modal (published result or awaiting notice)
  const [selectedModalItem, setSelectedModalItem] = useState(null);

  // Public settings state (strictly announcement text and visibility)
  const [settings, setSettings] = useState({
    announcement_text: '',
    show_announcement: false,
  });

  // Global Announcement Popup Modal state
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [activeContentHash, setActiveContentHash] = useState('');

  // Items state
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState(null);

  // Helper to generate a content hash from heading and message
  const getPopupContentHash = (heading, message) => {
    const str = `${heading || ''}:::${message || ''}`.trim();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  // Handle popup close & dismissal per content version
  const handleClosePopup = () => {
    setShowPopup(false);
    if (activeContentHash) {
      localStorage.setItem(`sargolsav_popup_dismissed_${activeContentHash}`, 'true');
    }
  };

  // Evaluate Popup Frequency Rule & Content Versioning
  const evaluatePopupTrigger = useCallback((config) => {
    if (!config || !config.is_popup_active) return;

    // Increment sargolsav_popup_visits in localStorage on page load
    const countKey = 'sargolsav_popup_visits';
    const rawVisits = parseInt(localStorage.getItem(countKey) || '0', 10);
    const visits = (isNaN(rawVisits) ? 0 : rawVisits) + 1;
    localStorage.setItem(countKey, String(visits));

    const contentHash = getPopupContentHash(config.popup_heading, config.popup_message);
    setActiveContentHash(contentHash);

    const freq =
      typeof config.popup_frequency === 'number'
        ? config.popup_frequency
        : parseInt(config.popup_frequency, 10) >= 0
        ? parseInt(config.popup_frequency, 10)
        : 1;

    const isDismissed =
      localStorage.getItem(`sargolsav_popup_dismissed_${contentHash}`) === 'true';

    let shouldShow = false;
    if (freq === 0) {
      // 0 = show once forever per content version
      if (!isDismissed) shouldShow = true;
    } else if (freq === 1) {
      // 1 = show on every page load
      shouldShow = true;
    } else if (freq > 1) {
      // Show when (visits % popup_frequency) === 1
      if (visits % freq === 1) {
        shouldShow = true;
      }
    }

    if (shouldShow) {
      setPopupData({
        heading: config.popup_heading || '',
        message: config.popup_message || '',
        imageUrl: config.popup_image_url || '',
        btn1Text: config.popup_btn1_text || '',
        btn1Url: config.popup_btn1_url || '',
        btn2Text: config.popup_btn2_text || '',
        btn2Url: config.popup_btn2_url || '',
      });
      setShowPopup(true);
    }
  }, []);

  // Fetch public settings & popup configuration
  useEffect(() => {
    async function fetchPublicSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (error) {
          console.warn('Error fetching settings from Supabase:', error.message);
          return;
        }

        if (data) {
          setSettings({
            announcement_text: data.announcement_text || '',
            show_announcement: Boolean(data.show_announcement),
          });
          evaluatePopupTrigger(data);
        }
      } catch (err) {
        console.warn('Error in fetchPublicSettings:', err);
      }
    }

    fetchPublicSettings();
  }, [evaluatePopupTrigger]);

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

  // Category counts dynamically matching the active toggle mode (showPublishedOnly)
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = 0;
    }
    for (const item of items) {
      if (counts[item.category] !== undefined) {
        if (!showPublishedOnly || item.is_published) {
          counts[item.category]++;
        }
      }
    }
    return counts;
  }, [items, showPublishedOnly]);

  // Zero double-click bug handler: pass selected category directly
  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Filter items for selected category
  const totalCategoryItems = useMemo(() => {
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const publishedCategoryItems = useMemo(() => {
    return totalCategoryItems.filter((item) => item.is_published);
  }, [totalCategoryItems]);

  const displayedCategoryItems = useMemo(() => {
    return showPublishedOnly ? publishedCategoryItems : totalCategoryItems;
  }, [showPublishedOnly, publishedCategoryItems, totalCategoryItems]);

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
                  placeholder="Search by Reg No, Name, or Madrasa..."
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
                  Instant search: Type a student Reg No, name, or madrasa to view individual points & result sheets.
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                        Categories
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
                      {/* Segmented Filter Toggle */}
                      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setShowPublishedOnly(true)}
                          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            showPublishedOnly
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <span>✅</span>
                          <span>Published Only</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPublishedOnly(false)}
                          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            !showPublishedOnly
                              ? 'bg-[#1B254B] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <span>📋</span>
                          <span>Show All Items</span>
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {showPublishedOnly
                          ? `${publishedCategoryItems.length} Published in ${selectedCategory}`
                          : `${totalCategoryItems.length} Items in ${selectedCategory}`}
                      </span>
                    </div>
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
                ) : displayedCategoryItems.length === 0 ? (
                  showPublishedOnly && totalCategoryItems.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-4 shadow-xs">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500 shadow-2xs">
                        <Clock className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 max-w-md mx-auto">
                        <h4 className="text-base sm:text-lg font-bold text-[#1B254B]">
                          No results published in {selectedCategory} yet.
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                          Tabulation and score entry are currently in progress for this category. You can view all {totalCategoryItems.length} scheduled items and their details.
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowPublishedOnly(false)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#1B254B] hover:bg-[#F26430] text-white transition-all shadow-xs hover:shadow-md cursor-pointer hover:scale-102 active:scale-98"
                        >
                          <Eye className="w-4 h-4 text-orange-400" />
                          <span>View All Scheduled {selectedCategory} Items ({totalCategoryItems.length})</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-[#1B254B]">No items found</h4>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                        No items registered in the {selectedCategory} category yet.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {displayedCategoryItems.map((item) => (
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

      {/* Global Announcement Popup Modal */}
      <GlobalAnnouncementModal
        isOpen={showPopup}
        onClose={handleClosePopup}
        popupData={popupData}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 px-4 print:hidden">
        <div className="max-w-6xl mx-auto space-y-3">
          <DeveloperFooter />
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Venue: Amal College of Advanced Studies, Myladi, Nilambur
          </p>
        </div>
      </footer>

      {/* Floating Action Button: 🏆 Poster Maker */}
      <Link
        to="/poster"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#1B254B] text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl hover:bg-[#F26430] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 print:hidden cursor-pointer"
        title="Open Winner Poster Maker Toolkit"
      >
        <span className="text-base sm:text-lg leading-none">🏆</span>
        <span>Poster Maker</span>
      </Link>
    </div>
  );
}
