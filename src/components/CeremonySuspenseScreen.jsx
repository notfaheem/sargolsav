import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isCeremonyLocked } from '../lib/ceremonyLock';
import { Trophy, RotateCw, Sparkles } from 'lucide-react';

export default function CeremonySuspenseScreen({ onUnlock }) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        const locked = isCeremonyLocked(data);
        if (!locked) {
          if (onUnlock) onUnlock();
          return;
        }
      }
      setLastChecked(new Date());
    } catch (err) {
      console.warn('Error polling ceremony lock status:', err);
    } finally {
      setIsChecking(false);
    }
  }, [onUnlock]);

  // Auto-polling every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Festive Background Ambient Watercolor Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1B254B]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Suspense Card */}
      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 text-center space-y-6">
        {/* Official Branding Header */}
        <div className="space-y-3">
          <div className="inline-block bg-white/95 p-3 rounded-2xl shadow-lg transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="Sargolsav 2026 Logo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-amber-400/20 mb-1.5">
              <span>MSM-CIER KERALA</span>
              <span className="text-amber-500/60">•</span>
              <span>NILAMBUR SUB-DISTRICT</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-sans">
              SARGOLSAV <span className="text-[#F26430]">2026</span>
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              AMAL COLLEGE, MYLADI
            </p>
          </div>
        </div>

        {/* Animated Trophy & Live Pulsing Badge */}
        <div className="py-2 flex flex-col items-center justify-center relative">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/20 relative z-10 animate-bounce duration-1000">
              <Trophy className="w-10 h-10 text-slate-950" />
            </div>
            <div className="absolute -inset-2 bg-amber-400/30 rounded-3xl blur-md animate-pulse" />
          </div>

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>✨ CLOSING CEREMONY IN PROGRESS</span>
          </div>
        </div>

        {/* Announcements (Malayalam & English) */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5">
            <p className="text-base sm:text-xl font-bold text-amber-100 leading-relaxed font-ml">
              സമാപന സമ്മേളനം പുരോഗമിക്കുന്നു! അന്തിമ ഫലങ്ങളും ചാമ്പ്യൻഷിപ്പ് പ്രഖ്യാപനവും സമാപന ചടങ്ങിൽ വെച്ച് പ്രസിദ്ധീകരിക്കുന്നതാണ്.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed px-2 font-medium">
            Final Results & Overall Championships are currently locked for the Closing Ceremony announcement.
            The full portal and Winner Poster Maker will unlock right after the official declaration!
          </p>
        </div>

        {/* Real-time Status & Manual Check Button */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <button
            type="button"
            onClick={checkStatus}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Live Status...' : '🔄 Check Status'}</span>
          </button>

          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Auto-refreshing every 15s • Unlocks automatically</span>
          </p>
        </div>
      </div>
    </div>
  );
}
