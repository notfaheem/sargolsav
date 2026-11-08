import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Users, Eye, RotateCw, AlertTriangle, Loader2, Sparkles, Activity } from 'lucide-react';

export default function LiveAnalyticsBanner({ onShowToast }) {
  const [liveViewers, setLiveViewers] = useState(1);
  const [totalViews, setTotalViews] = useState(0);
  const [isLoadingViews, setIsLoadingViews] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Fetch Total Views from settings
  const fetchTotalViews = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingViews(true);
    else setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('total_views')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setTotalViews(Number(data?.total_views) || 0);
    } catch (err) {
      console.warn('Error fetching total views:', err);
    } finally {
      setIsLoadingViews(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTotalViews();
  }, [fetchTotalViews]);

  // 2. Track Live Active Presence via Supabase Realtime channel
  useEffect(() => {
    const channel = supabase.channel('online-visitors');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        Object.values(state).forEach((presences) => {
          count += presences.length;
        });
        // At least 1 viewer (the admin or active visitors)
        setLiveViewers(Math.max(1, count));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.info('REALTIME_PRESENCE', `Visitor joined: ${newPresences.length} new presence`);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.info('REALTIME_PRESENCE', `Visitor left: ${leftPresences.length} presence`);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ admin_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Reset total views counter to 0
  const handleResetCounter = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ total_views: 0 })
        .eq('id', 1);

      if (error) throw error;

      setTotalViews(0);
      setShowResetModal(false);
      logger.warn('COUNTER_RESET', 'Admin reset total website views to 0');
      if (onShowToast) onShowToast('Total views counter reset to 0.', 'success');
    } catch (err) {
      console.error('Error resetting counter:', err);
      if (onShowToast) onShowToast(`Failed to reset: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#10172d] via-[#1B254B] to-[#16214A] rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden mb-6">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-80 h-32 bg-[#F26430]/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-white/10 text-emerald-400 border border-white/10">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white">
                Live Traffic & Analytics Desk
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Realtime
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live concurrent festival visitors & cumulative public website pageviews
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchTotalViews(true)}
            disabled={isRefreshing || isLoadingViews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 disabled:opacity-50"
            title="Refresh Views Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F26430]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 transition-all cursor-pointer border border-red-500/20"
            title="Reset Total Views Counter"
          >
            Reset Counter
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        {/* Card 1: Live Viewers Right Now */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Live Viewers Right Now
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-black text-3xl sm:text-4xl text-white">
                {liveViewers}
              </span>
              <span className="text-xs text-slate-400 font-medium">active on portal</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Synchronized via Supabase Presence channel
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Website Views */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="w-3.5 h-3.5 text-[#F26430]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Total Website Views
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {isLoadingViews ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#F26430]" />
              ) : (
                <span className="font-mono font-black text-3xl sm:text-4xl text-amber-300">
                  {totalViews.toLocaleString()}
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">views recorded</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unique browser sessions registered on public portal
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Eye className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Reset Total Views Counter */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B254B]">
                Reset Website Views Counter?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will reset the total recorded views counter ({totalViews}) back to 0. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetCounter}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Reset to 0</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
