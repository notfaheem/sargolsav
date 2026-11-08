import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import Toast from '../components/Toast';
import DiagnosticsConsole from '../components/DiagnosticsConsole';
import ParticipantManager from '../components/ParticipantManager';
import ScoreSheetManager from '../components/ScoreSheetManager';
import {
  Lock,
  Unlock,
  ExternalLink,
  LogOut,
  Sliders,
  FileSpreadsheet,
  Users,
  FolderArchive,
  Save,
  Loader2,
  Megaphone,
  KeyRound,
  ShieldAlert,
  Info,
  Trophy,
} from 'lucide-react';
import ChampionshipsTab from '../components/ChampionshipsTab';

const SESSION_STORAGE_KEY = 'sargolsav_admin_session';

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Active Admin Tab: default to 'settings' or 'participants'
  const [activeTab, setActiveTab] = useState('settings');

  // Settings State
  const [settings, setSettings] = useState({
    id: 1,
    announcement_text: '',
    show_announcement: false,
    enforce_min_entry_rule: false,
    admin_pin: '2026',
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Check existing session
  useEffect(() => {
    const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch Settings once authenticated
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('id, announcement_text, show_announcement, enforce_min_entry_rule, admin_pin')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        logger.error('SETTINGS_FETCH', `Failed to load settings: ${error.message}`);
        return;
      }

      if (data) {
        setSettings({
          id: data.id || 1,
          announcement_text: data.announcement_text || '',
          show_announcement: Boolean(data.show_announcement),
          enforce_min_entry_rule: Boolean(data.enforce_min_entry_rule),
          admin_pin: data.admin_pin || '2026',
        });
        logger.success('SETTINGS_FETCH', 'Loaded festival configuration row (id=1)');
      }
    } catch (err) {
      console.error('Unexpected error loading settings:', err);
      logger.error('SETTINGS_FETCH', `Unexpected error: ${err.message}`);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, fetchSettings]);

  // Handle PIN Submission
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    setIsVerifyingPin(true);

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('admin_pin')
        .eq('id', 1)
        .single();

      const expectedPin = data?.admin_pin || '2026';

      if (inputPin.trim() === expectedPin.trim()) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
        setIsAuthenticated(true);
        setInputPin('');
        logger.success('AUTH_LOGIN', 'Admin session authenticated successfully');
      } else {
        setPinError('Incorrect PIN. Please enter the valid 4-digit committee PIN.');
        logger.warn('AUTH_LOGIN_FAILED', 'Invalid PIN entered');
      }
    } catch (err) {
      console.error('PIN verification error:', err);
      // Fallback check against 2026 if network issue
      if (inputPin.trim() === '2026') {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
        setIsAuthenticated(true);
        logger.success('AUTH_LOGIN', 'Admin session unlocked via local fallback PIN');
      } else {
        setPinError('Incorrect PIN. Please check your network and try again.');
        logger.error('AUTH_LOGIN_ERROR', err.message);
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Handle Logout / Lock
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    setInputPin('');
    logger.warn('AUTH_LOGOUT', 'Admin session locked by user');
  };

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          announcement_text: settings.announcement_text,
          show_announcement: settings.show_announcement,
          enforce_min_entry_rule: settings.enforce_min_entry_rule,
          admin_pin: settings.admin_pin,
        })
        .eq('id', 1);

      if (error) {
        throw error;
      }

      logger.success('SETTINGS_UPDATE', 'Updated announcement, minimum entry rule, and PIN', {
        showAnnouncement: settings.show_announcement,
        enforceMinRule: settings.enforce_min_entry_rule,
      });

      setToast({
        message: 'Settings saved successfully!',
        type: 'success',
      });
      setTimeout(() => {
        setToast({ message: '', type: 'success' });
      }, 3500);
    } catch (err) {
      console.error('Error saving settings:', err);
      logger.error('SETTINGS_UPDATE', `Save failed: ${err.message}`);
      setToast({
        message: 'Failed to save settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated, render PIN Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            {/* Official Logo */}
            <div className="mb-3 flex justify-center">
              <img
                src="/logo.png"
                alt="MSM-CIER Sargolsav 2026 Logo"
                className="h-20 w-auto object-contain drop-shadow-xs"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1B254B] tracking-tight">
              SARGOLSAV 2026
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F26430] mt-0.5">
              Admin & Tabulation Portal
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Enter committee PIN to access festival settings and tabulation controls.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="pin-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Admin Security PIN
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type="password"
                  maxLength={10}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="Enter PIN (Default: 2026)"
                  autoFocus
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                />
              </div>
              {pinError && (
                <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingPin}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#1B254B] text-white hover:bg-navy-800 focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:ring-offset-2 transition-all cursor-pointer shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isVerifyingPin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-[#F26430]" />
                  <span>Unlock Admin Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1B254B] transition-colors"
            >
              <span>View Public Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard Tabs
  const adminTabs = [
    { id: 'settings', label: 'Settings', icon: Sliders },
    { id: 'participants', label: 'Participants (Bulk Import)', icon: Users },
    { id: 'scoresheet', label: 'Score Sheet (Tabulation)', icon: FileSpreadsheet },
    { id: 'championships', label: 'Championships', icon: Trophy },
    { id: 'resources', label: 'Resources', icon: FolderArchive },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Admin Top Header */}
      <header className="bg-[#1B254B] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Official Logo in White Rounded Pill Container so vibrant colours pop cleanly */}
            <div className="bg-white p-1 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Sargolsav Logo"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight">
                  SARGOLSAV 2026 Admin Portal
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#F26430] text-white">
                  Nilambur Sub-District
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Amal College, Myladi • Tabulation & Festival Management Desk
              </p>
            </div>
          </div>

          {/* Action buttons: View Live Site & Lock/Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-all border border-white/10"
              title="Open Public Results Website"
            >
              <span>View Live Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#F26430]" />
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white transition-all border border-red-500/30 cursor-pointer"
              title="Lock Admin Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock / Logout</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="border-t border-white/10 bg-[#161F3E]">
          <div className="max-w-6xl mx-auto px-4">
            <nav
              className="flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-none py-2"
              aria-label="Admin Tabs"
            >
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#F26430] text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* Settings Tab - Fully Functional with System Diagnostics Console */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1B254B]">
                    Portal Settings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage top festival announcement, scoring rules, and security credentials.
                  </p>
                </div>
                {isLoadingSettings && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveSettings} className="mt-6 space-y-6">
                {/* 1. Announcement Text */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#F26430]" />
                    <label htmlFor="announcement_text" className="text-sm font-bold text-[#1B254B]">
                      Top Announcement Banner Text
                    </label>
                  </div>
                  <textarea
                    id="announcement_text"
                    rows={3}
                    value={settings.announcement_text}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, announcement_text: e.target.value }))
                    }
                    placeholder="e.g. Welcome to MSM-CIER Sargolsav 2026 - Nilambur Sub-District at Amal College, Myladi!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500">
                    This message displays in a prominent banner at the very top of the public website.
                  </p>
                </div>

                {/* 2. Show Announcement Banner Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="space-y-0.5 pr-4">
                    <label
                      htmlFor="show_announcement"
                      className="text-sm font-bold text-[#1B254B] cursor-pointer"
                    >
                      Show Announcement Banner
                    </label>
                    <p className="text-xs text-slate-500">
                      Toggle to display or hide the top announcement bar on the public portal.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    id="show_announcement"
                    aria-checked={settings.show_announcement}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        show_announcement: !prev.show_announcement,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#F26430] ${
                      settings.show_announcement ? 'bg-[#16A34A]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.show_announcement ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Enforce Minimum 2 Entries Rule Switch */}
                <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="space-y-1 pr-4">
                    <label
                      htmlFor="enforce_min_entry_rule"
                      className="text-sm font-bold text-[#1B254B] cursor-pointer"
                    >
                      Enforce Minimum 2 Entries Rule (Page 2, Rule 12)
                    </label>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <em>
                        "When ON, items with only 1 participant receive Grades only (0 points). Keep OFF to award normal rank & grade points to single entries."
                      </em>
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      <Info className="w-3 h-3 text-blue-500" />
                      <span>Scoring engine rule specification</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    id="enforce_min_entry_rule"
                    aria-checked={settings.enforce_min_entry_rule}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        enforce_min_entry_rule: !prev.enforce_min_entry_rule,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#F26430] mt-1 ${
                      settings.enforce_min_entry_rule ? 'bg-[#16A34A]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.enforce_min_entry_rule ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Admin PIN */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#1B254B]" />
                    <label htmlFor="admin_pin" className="text-sm font-bold text-[#1B254B]">
                      Admin Security PIN
                    </label>
                  </div>
                  <div className="max-w-xs">
                    <input
                      id="admin_pin"
                      type="text"
                      maxLength={10}
                      value={settings.admin_pin}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, admin_pin: e.target.value }))
                      }
                      placeholder="e.g. 2026"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono font-bold tracking-wider text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Use this PIN to unlock the `/admin` portal on any committee device.
                  </p>
                </div>

                {/* Save Button with Button Locking & Spinner */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoadingSettings}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-[#1B254B] text-white hover:bg-navy-800 focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:ring-offset-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                        <span>Saving Settings...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-[#F26430]" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* System Diagnostics & Activity Console Panel (Phase 2) */}
            <DiagnosticsConsole />
          </div>
        )}

        {/* Participants (Bulk Import & Manager) - Fully Functional in Phase 2 */}
        {activeTab === 'participants' && (
          <ParticipantManager
            onShowToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          />
        )}

        {/* Tabulation Score Sheet (Digital Consolidated Score Sheet - Phase 3) */}
        {activeTab === 'scoresheet' && (
          <ScoreSheetManager
            onShowToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          />
        )}

        {/* Championships & Standings Tab */}
        {activeTab === 'championships' && <ChampionshipsTab />}

        {/* Resources Tab (Placeholder for Phase 6) */}
        {activeTab === 'resources' && (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center shadow-xs">
              <FolderArchive className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B254B]">
              Resource & Document Management
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload PDF program books, rules manuals, mark sheets, and venue instructions directly to Supabase storage in Phase 6.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-[#1B254B] hover:bg-slate-200"
              >
                Go to Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
