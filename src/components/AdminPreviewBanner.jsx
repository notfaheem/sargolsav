import React from 'react';
import { setAdminBypass } from '../lib/ceremonyLock';
import { ShieldAlert, LogOut, ArrowRight } from 'lucide-react';

export default function AdminPreviewBanner({ onExitPreview }) {
  const handleExit = () => {
    setAdminBypass(false);
    if (onExitPreview) {
      onExitPreview();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('admin_preview');
      window.location.href = url.pathname + (url.search ? url.search : '');
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white shadow-lg sticky top-0 z-50 px-4 py-2 text-xs sm:text-sm font-bold border-b border-red-700/50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-full bg-white/20 text-white animate-pulse shrink-0">
            <ShieldAlert className="w-4 h-4 text-white" />
          </span>
          <span className="leading-tight">
            <strong>🔓 ADMIN PREVIEW MODE</strong> — Public site is currently <strong>LOCKED</strong> for regular visitors
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="Exit Admin Bypass and return to locked view"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Preview</span>
          </button>

          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-black/40 hover:bg-black/60 text-white transition-colors"
            title="Return to Admin Panel"
          >
            <span>Go to Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
