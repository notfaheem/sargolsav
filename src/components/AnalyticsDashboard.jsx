import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  Users,
  Eye,
  Download,
  Image as ImageIcon,
  BarChart3,
  TrendingUp,
  Clock,
  RefreshCw,
  Trophy,
  Medal,
  Award,
  Building2,
  Calendar,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
  Search,
} from 'lucide-react';

// Time filter options
const TIME_FILTERS = [
  { id: '24h', label: 'Last 24 Hours' },
  { id: 'today', label: 'Today' },
  { id: 'all', label: 'All Time' },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((now - date) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export default function AnalyticsDashboard({ onShowToast }) {
  const [timeFilter, setTimeFilter] = useState('24h');
  const [events, setEvents] = useState([]);
  const [baselineViews, setBaselineViews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Realtime Presence states
  const [liveVisitors, setLiveVisitors] = useState(1);
  const [presenceTrend, setPresenceTrend] = useState([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  // Reset baseline modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Hover state for interactive chart tooltip
  const [hoveredBar, setHoveredBar] = useState(null);

  // 1. Subscribe to Live Realtime Presence
  useEffect(() => {
    const channel = supabase.channel('online-visitors');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        Object.values(state).forEach((presences) => {
          count += presences.length;
        });
        const currentCount = Math.max(1, count);
        setLiveVisitors(currentCount);

        setPresenceTrend((prev) => {
          const next = [...prev.slice(-14), currentCount];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ admin_tab_at: new Date().toISOString() });
        }
      });

    // Sample presence trend periodically every 20s
    const sampleInterval = setInterval(() => {
      setPresenceTrend((prev) => {
        const next = [...prev.slice(-14), liveVisitors];
        return next;
      });
    }, 20000);

    return () => {
      clearInterval(sampleInterval);
      supabase.removeChannel(channel);
    };
  }, [liveVisitors]);

  // 2. Fetch Events & Settings Baseline
  const fetchAnalyticsData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch settings baseline total_views
      const { data: settingsData } = await supabase
        .from('settings')
        .select('total_views')
        .eq('id', 1)
        .single();

      if (settingsData) {
        setBaselineViews(Number(settingsData.total_views) || 0);
      }

      // Fetch analytics events (latest 5000)
      const { data: eventsData, error } = await supabase
        .from('analytics_events')
        .select('id, event_type, item_code, item_name, category, madrasa, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) {
        console.warn('Analytics fetch warning:', error);
      } else {
        setEvents(eventsData || []);
      }

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Error loading analytics:', err);
      if (onShowToast) onShowToast('Failed to load some analytics events.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // 3. Filter events by selected time window
  const filteredEvents = useMemo(() => {
    if (timeFilter === 'all') return events;

    const now = new Date().getTime();
    if (timeFilter === '24h') {
      const past24h = now - 24 * 60 * 60 * 1000;
      return events.filter((e) => new Date(e.created_at).getTime() >= past24h);
    }

    if (timeFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startMs = startOfToday.getTime();
      return events.filter((e) => new Date(e.created_at).getTime() >= startMs);
    }

    return events;
  }, [events, timeFilter]);

  // 4. Aggregated Counts
  const metrics = useMemo(() => {
    let pageViews = 0;
    let itemViews = 0;
    let pdfDownloads = 0;
    let posterDownloads = 0;
    let searchQueries = 0;

    filteredEvents.forEach((e) => {
      if (e.event_type === 'page_view') pageViews++;
      else if (e.event_type === 'item_view') itemViews++;
      else if (e.event_type === 'pdf_download') pdfDownloads++;
      else if (e.event_type === 'poster_download') posterDownloads++;
      else if (e.event_type === 'search_query') searchQueries++;
    });

    // Total Portal Views: lifetime page_view events + baseline total_views
    const allPageViewsCount = events.filter((e) => e.event_type === 'page_view').length;
    const computedTotalViews = Math.max(baselineViews, allPageViewsCount + baselineViews);

    return {
      windowPageViews: pageViews,
      totalPortalViews: computedTotalViews,
      itemViews,
      pdfDownloads,
      posterDownloads,
      searchQueries,
    };
  }, [filteredEvents, events, baselineViews]);

  // 5. Timeline Chart Data (Hourly for 24h/today, Daily for all)
  const timelineData = useMemo(() => {
    const isHourly = timeFilter === '24h' || timeFilter === 'today';

    if (isHourly) {
      // 24 slots (one per hour)
      const slots = [];
      const now = new Date();

      for (let i = 23; i >= 0; i--) {
        const slotDate = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = slotDate.getHours();
        const displayLabel = `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'pm' : 'am'}`;
        const key = `${slotDate.getFullYear()}-${slotDate.getMonth()}-${slotDate.getDate()}-${hour}`;
        slots.push({
          key,
          label: displayLabel,
          fullDate: slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }),
          pageViews: 0,
          itemViews: 0,
          posters: 0,
          total: 0,
        });
      }

      const slotMap = new Map(slots.map((s) => [s.key, s]));

      filteredEvents.forEach((e) => {
        const d = new Date(e.created_at);
        const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const slot = slotMap.get(k);
        if (slot) {
          if (e.event_type === 'page_view') slot.pageViews++;
          else if (e.event_type === 'item_view') slot.itemViews++;
          else if (e.event_type === 'poster_download') slot.posters++;
          slot.total++;
        }
      });

      const maxVal = Math.max(1, ...slots.map((s) => s.total));
      return { isHourly: true, slots, maxVal };
    }

    // Daily Timeline for 'all'
    const dayMap = new Map();
    filteredEvents.forEach((e) => {
      const d = new Date(e.created_at);
      const k = d.toISOString().split('T')[0];
      if (!dayMap.has(k)) {
        dayMap.set(k, {
          key: k,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          pageViews: 0,
          itemViews: 0,
          posters: 0,
          total: 0,
        });
      }
      const slot = dayMap.get(k);
      if (e.event_type === 'page_view') slot.pageViews++;
      else if (e.event_type === 'item_view') slot.itemViews++;
      else if (e.event_type === 'poster_download') slot.posters++;
      slot.total++;
    });

    const slots = Array.from(dayMap.values()).reverse().slice(-14);
    if (slots.length === 0) {
      slots.push({
        key: 'today',
        label: 'Today',
        fullDate: 'Today',
        pageViews: 0,
        itemViews: 0,
        posters: 0,
        total: 0,
      });
    }
    const maxVal = Math.max(1, ...slots.map((s) => s.total));
    return { isHourly: false, slots, maxVal };
  }, [filteredEvents, timeFilter]);

  // 6. Most Viewed Results Leaderboard (Top 10 Items)
  const topViewedItems = useMemo(() => {
    const itemMap = new Map();

    filteredEvents.forEach((e) => {
      if (e.event_type === 'item_view' || e.event_type === 'pdf_download') {
        const code = e.item_code || 'N/A';
        if (!itemMap.has(code)) {
          itemMap.set(code, {
            code,
            name: e.item_name || `Item #${code}`,
            category: e.category || 'GENERAL',
            views: 0,
            downloads: 0,
          });
        }
        const record = itemMap.get(code);
        if (e.event_type === 'item_view') record.views++;
        if (e.event_type === 'pdf_download') record.downloads++;
      }
    });

    const list = Array.from(itemMap.values()).sort(
      (a, b) => b.views + b.downloads * 2 - (a.views + a.downloads * 2)
    );
    const top10 = list.slice(0, 10);
    const maxViews = Math.max(1, ...top10.map((i) => i.views));

    return { items: top10, maxViews };
  }, [filteredEvents]);

  // 7. Poster Maker Breakdown by Item and Madrasa
  const posterInsights = useMemo(() => {
    const itemCounts = new Map();
    const madrasaCounts = new Map();
    const recentPosters = [];

    filteredEvents.forEach((e) => {
      if (e.event_type === 'poster_download') {
        // By Item
        const code = e.item_code || 'GEN';
        const itemKey = `${code}::${e.item_name || 'Item'}::${e.category || ''}`;
        if (!itemCounts.has(itemKey)) {
          itemCounts.set(itemKey, {
            code,
            name: e.item_name || `Item #${code}`,
            category: e.category || 'GENERAL',
            count: 0,
          });
        }
        itemCounts.get(itemKey).count++;

        // By Madrasa
        const madrasaName = (e.madrasa || '').trim();
        if (madrasaName) {
          madrasaCounts.set(madrasaName, (madrasaCounts.get(madrasaName) || 0) + 1);
        }

        // Recent Posters
        if (recentPosters.length < 10) {
          recentPosters.push({
            id: e.id,
            studentName: e.metadata || 'Participant',
            madrasa: e.madrasa || 'General Unit',
            itemName: e.item_name || (e.item_code ? `Item #${e.item_code}` : 'Celebration Poster'),
            category: e.category || '',
            createdAt: e.created_at,
          });
        }
      }
    });

    const topItems = Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topMadrasas = Array.from(madrasaCounts.entries())
      .map(([madrasa, count]) => ({ madrasa, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const maxMadrasaPosters = Math.max(1, ...topMadrasas.map((m) => m.count));

    return {
      topItems,
      topMadrasas,
      maxMadrasaPosters,
      recentPosters,
    };
  }, [filteredEvents]);

  // 8. Handle Reset Baseline Counter
  const handleResetBaseline = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ total_views: 0 })
        .eq('id', 1);

      if (error) throw error;

      setBaselineViews(0);
      setShowResetModal(false);
      logger.warn('COUNTER_RESET', 'Admin reset total website views baseline to 0');
      if (onShowToast) onShowToast('Total views baseline reset to 0.', 'success');
    } catch (err) {
      console.error('Error resetting counter:', err);
      if (onShowToast) onShowToast(`Failed to reset: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1B254B] tracking-tight">
              Festival Analytics & Live Telemetry
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Realtime presence, visitor engagement, top viewed items, and celebration poster generation metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {TIME_FILTERS.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeFilter(tf.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeFilter === tf.id
                    ? 'bg-white text-[#1B254B] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchAnalyticsData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top KPI Summary Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 🟢 Live Active Visitors Now */}
        <div className="bg-gradient-to-br from-[#10172d] to-[#1B254B] rounded-3xl p-5 text-white border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              Live Visitors
            </span>
            <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
              Realtime
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight">{liveVisitors}</span>
              <span className="text-xs text-slate-300 font-medium">on site now</span>
            </div>

            {/* Sparkline trend of recent presence samples */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-end gap-1 h-6">
                {presenceTrend.map((val, idx) => {
                  const maxTrend = Math.max(1, ...presenceTrend);
                  const heightPercent = Math.max(18, Math.round((val / maxTrend) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-emerald-400/50 hover:bg-emerald-400 rounded-t-xs transition-all"
                      style={{ height: `${heightPercent}%` }}
                      title={`${val} live visitors`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>Session presence pulse</span>
                <span className="text-emerald-400 font-bold">Active</span>
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: 👁️ Total Portal Views */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              Total Portal Views
            </span>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Reset views baseline counter"
            >
              Reset
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1B254B]">
                {metrics.totalPortalViews.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{timeFilter === 'all' ? 'All recorded views' : `In ${TIME_FILTERS.find(t=>t.id===timeFilter)?.label}`}:</span>
              <span className="font-bold text-blue-600">
                +{metrics.windowPageViews.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: 🎨 Total Posters Generated */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
              Posters Generated
            </span>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              Poster Maker
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1B254B]">
                {metrics.posterDownloads.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-medium">cards created</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Celebratory exports</span>
              <span className="font-bold text-amber-600">High engagement</span>
            </div>
          </div>
        </div>

        {/* Card 4: 📥 Result PDFs Downloaded */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Result PDFs Exported
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              Tabulation
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1B254B]">
                {metrics.pdfDownloads.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-medium">official PDFs</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Modal Result Views</span>
              <span className="font-bold text-[#1B254B]">{metrics.itemViews.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic & Views Timeline Graph (Pure SVG & Tailwind Bar Chart) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1B254B] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Visitor & Interaction Traffic Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hourly and daily distribution of visits, item modal views, and celebratory poster downloads.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span className="text-slate-600 font-medium">Page Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-400" />
              <span className="text-slate-600 font-medium">Item Results</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-slate-600 font-medium">Posters</span>
            </div>
          </div>
        </div>

        {/* Visual Timeline Bar Chart */}
        <div className="relative pt-6">
          {/* Tooltip on hover */}
          {hoveredBar && (
            <div className="absolute top-0 right-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none flex items-center gap-3 z-10 animate-in fade-in duration-100">
              <span className="font-bold text-slate-200">{hoveredBar.fullDate}:</span>
              <span className="text-indigo-300 font-bold">{hoveredBar.pageViews} views</span>
              <span className="text-blue-300 font-bold">{hoveredBar.itemViews} items</span>
              <span className="text-amber-300 font-bold">{hoveredBar.posters} posters</span>
            </div>
          )}

          <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 sm:h-56 px-2 border-b border-slate-200">
            {timelineData.slots.map((slot) => {
              const maxVal = timelineData.maxVal;
              const totalHeight = Math.max(8, Math.round((slot.total / maxVal) * 100));

              // Proportional segment heights
              const pvPct = slot.total > 0 ? (slot.pageViews / slot.total) * totalHeight : 0;
              const ivPct = slot.total > 0 ? (slot.itemViews / slot.total) * totalHeight : 0;
              const postPct = slot.total > 0 ? (slot.posters / slot.total) * totalHeight : 0;

              return (
                <div
                  key={slot.key}
                  onMouseEnter={() => setHoveredBar(slot)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Stacked bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-110"
                    style={{ height: `${totalHeight}%` }}
                  >
                    {postPct > 0 && (
                      <div className="bg-amber-400 transition-all" style={{ height: `${postPct}%` }} />
                    )}
                    {ivPct > 0 && (
                      <div className="bg-blue-400 transition-all" style={{ height: `${ivPct}%` }} />
                    )}
                    {pvPct > 0 && (
                      <div className="bg-indigo-500 transition-all" style={{ height: `${pvPct}%` }} />
                    )}
                    {slot.total === 0 && (
                      <div className="bg-slate-100 h-2 rounded-t-xs" />
                    )}
                  </div>

                  {/* X-axis label */}
                  <span className="text-[10px] text-slate-400 group-hover:text-[#1B254B] font-semibold mt-2 -rotate-45 sm:rotate-0 origin-top-left transition-colors whitespace-nowrap">
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-5 px-2">
            <span>Earlier in selected period</span>
            <span>Latest / Now</span>
          </div>
        </div>
      </div>

      {/* Grid: Most Viewed Items & Poster Maker Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Viewed Results Leaderboard (Top 10 Items) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base sm:text-lg font-bold text-[#1B254B] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Most Viewed Result Items (Top 10)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by published item result views and PDF score sheet downloads.
            </p>
          </div>

          {topViewedItems.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-xs text-center">
              <Eye className="w-8 h-8 mb-2 opacity-30" />
              <p>No item view telemetry recorded yet for this time filter.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
              {topViewedItems.items.map((item, idx) => {
                const rank = idx + 1;
                const widthPercent = Math.max(
                  6,
                  Math.round((item.views / topViewedItems.maxViews) * 100)
                );

                return (
                  <div
                    key={item.code}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Rank Badge */}
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {rank}
                        </span>

                        <span className="text-[11px] font-mono font-bold bg-[#1B254B] text-white px-2 py-0.5 rounded-md shrink-0">
                          #{item.code}
                        </span>

                        <span className="text-xs sm:text-sm font-bold text-[#1B254B] truncate">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                        {item.category}
                      </span>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600 shrink-0 flex items-center gap-2">
                        <span className="text-indigo-600 font-bold">{item.views} views</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-bold">{item.downloads} PDFs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Poster Maker Insights */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base sm:text-lg font-bold text-[#1B254B] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <span>Poster Maker Insights</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of celebratory winners posters generated by Item and Madrasa.
            </p>
          </div>

          <div className="space-y-6 flex-1">
            {/* By Madrasa Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Top Madrasas Generating Posters</span>
              </h4>

              {posterInsights.topMadrasas.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No posters downloaded in this timeframe yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {posterInsights.topMadrasas.map((m) => {
                    const pct = Math.round((m.count / posterInsights.maxMadrasaPosters) * 100);
                    return (
                      <div
                        key={m.madrasa}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-bold text-[#1B254B] truncate max-w-[200px]">
                          {m.madrasa}
                        </span>
                        <div className="flex-1 flex items-center gap-2 max-w-xs">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-amber-600 shrink-0">
                            {m.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Posters Live Activity Feed */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Recent Celebratory Posters Generated</span>
              </h4>

              {posterInsights.recentPosters.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No recent poster downloads recorded.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {posterInsights.recentPosters.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#1B254B] truncate">{p.studentName}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.madrasa} • {p.itemName}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                        {formatRelativeTime(p.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Total Views Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#1B254B]">
              Reset Total Portal Views Counter?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This will reset the baseline views counter back to 0. Historical event logs will remain preserved in the database.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBaseline}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
