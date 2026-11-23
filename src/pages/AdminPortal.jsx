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
  Bell,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  Trash2,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import ChampionshipsTab from '../components/ChampionshipsTab';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import AdminResourceManager from '../components/AdminResourceManager';
import MadrasaUnitMapper from '../components/MadrasaUnitMapper';
import DeveloperFooter from '../components/DeveloperFooter';
import GlobalAnnouncementModal from '../components/GlobalAnnouncementModal';

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
    // Public Championships Lock
    is_championships_locked: true,
    manual_overrides: null,
    // Global Popup Settings
    is_popup_active: false,
    popup_heading: '',
    popup_message: '',
    popup_image_url: '',
    popup_btn1_text: '',
    popup_btn1_url: '',
    popup_btn2_text: '',
    popup_btn2_url: '',
    popup_frequency: 1,
  });
  const [showPopupPreview, setShowPopupPreview] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Custom Lock Notice Message State
  const [lockTitleInput, setLockTitleInput] = useState(() => {
    return (
      localStorage.getItem('sargolsav_lock_title') ||
      '⏳ Fetching Overall & Championship Results...'
    );
  });
  const [lockMessageInput, setLockMessageInput] = useState(() => {
    return (
      localStorage.getItem('sargolsav_lock_message') ||
      'Final championship standings are currently being verified. Please check back later! (You can still view all Item-wise Results and Resources).'
    );
  });
  const [isSavingLockMessage, setIsSavingLockMessage] = useState(false);

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
        .select('*')
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
          is_championships_locked:
            data.is_championships_locked !== undefined
              ? Boolean(data.is_championships_locked)
              : true,
          manual_overrides: data.manual_overrides || null,
          is_popup_active: Boolean(data.is_popup_active),
          popup_heading: data.popup_heading || '',
          popup_message: data.popup_message || '',
          popup_image_url: data.popup_image_url || '',
          popup_btn1_text: data.popup_btn1_text || '',
          popup_btn1_url: data.popup_btn1_url || '',
          popup_btn2_text: data.popup_btn2_text || '',
          popup_btn2_url: data.popup_btn2_url || '',
          popup_frequency: typeof data.popup_frequency === 'number' ? data.popup_frequency : 1,
        });

        if (data.manual_overrides?.lock_title) {
          setLockTitleInput(data.manual_overrides.lock_title);
          localStorage.setItem('sargolsav_lock_title', data.manual_overrides.lock_title);
        }
        if (data.manual_overrides?.lock_message) {
          setLockMessageInput(data.manual_overrides.lock_message);
          localStorage.setItem('sargolsav_lock_message', data.manual_overrides.lock_message);
        }

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

  // Handle Image File Upload for Popup Header
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({
        message: 'Image file is larger than 2MB. A compressed image is recommended.',
        type: 'warning',
      });
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings((prev) => ({
        ...prev,
        popup_image_url: reader.result,
      }));
      setToast({
        message: 'Popup header image loaded. Click "Save Popup Settings" to publish.',
        type: 'success',
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Toggle Public Championships Lock (Feature 1)
  const [isTogglingChampLock, setIsTogglingChampLock] = useState(false);
  const handleTogglePublicChampLock = async () => {
    setIsTogglingChampLock(true);
    const newLockState = settings.is_championships_locked === false ? true : false;
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          is_championships_locked: newLockState,
          manual_overrides: {
            ...(settings.manual_overrides || {}),
            is_locked: newLockState,
          },
        })
        .eq('id', 1);

      if (error) {
        console.warn('Fallback update lock in manual_overrides...', error.message);
        await supabase
          .from('settings')
          .update({
            manual_overrides: {
              ...(settings.manual_overrides || {}),
              is_locked: newLockState,
            },
          })
          .eq('id', 1);
      }

      setSettings((prev) => ({
        ...prev,
        is_championships_locked: newLockState,
        manual_overrides: {
          ...(prev.manual_overrides || {}),
          is_locked: newLockState,
        },
      }));
      localStorage.setItem('sargolsav_championships_locked', String(newLockState));
      setToast({
        message: newLockState
          ? '🔒 Public Championships: LOCKED (Hidden from public view)'
          : '🔓 Public Championships: UNLOCKED (Now live to public)',
        type: 'success',
      });
    } catch (err) {
      console.error('Error toggling champ lock:', err);
      setSettings((prev) => ({ ...prev, is_championships_locked: newLockState }));
      localStorage.setItem('sargolsav_championships_locked', String(newLockState));
      setToast({ message: 'Toggled lock locally', type: 'info' });
    } finally {
      setIsTogglingChampLock(false);
    }
  };

  // Save Lock Notice Heading & Message from Settings Tab
  const handleSaveLockNotice = async () => {
    setIsSavingLockMessage(true);
    try {
      const nextOverrides = {
        ...(settings.manual_overrides || {}),
        is_locked: settings.is_championships_locked !== false,
        lock_title: lockTitleInput,
        lock_message: lockMessageInput,
      };

      const { error } = await supabase
        .from('settings')
        .update({ manual_overrides: nextOverrides })
        .eq('id', 1);

      if (error) {
        console.warn('Fallback saving notice via notice_text...', error.message);
        await supabase
          .from('settings')
          .update({
            notice_text: `JSON:{"type":"MANUAL_OVERRIDES","data":${JSON.stringify(nextOverrides)}}`,
          })
          .eq('id', 1);
      }

      setSettings((prev) => ({
        ...prev,
        manual_overrides: nextOverrides,
      }));
      localStorage.setItem('sargolsav_manual_overrides', JSON.stringify(nextOverrides));
      localStorage.setItem('sargolsav_lock_title', lockTitleInput);
      localStorage.setItem('sargolsav_lock_message', lockMessageInput);

      setToast({
        message: '💾 Lock screen title & message saved successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Error saving lock notice:', err);
      localStorage.setItem('sargolsav_lock_title', lockTitleInput);
      localStorage.setItem('sargolsav_lock_message', lockMessageInput);
      setToast({ message: 'Saved lock message locally (offline fallback)', type: 'info' });
    } finally {
      setIsSavingLockMessage(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        announcement_text: settings.announcement_text,
        show_announcement: settings.show_announcement,
        enforce_min_entry_rule: settings.enforce_min_entry_rule,
        admin_pin: settings.admin_pin,
        is_championships_locked: settings.is_championships_locked,
        is_popup_active: settings.is_popup_active,
        popup_heading: settings.popup_heading,
        popup_message: settings.popup_message,
        popup_image_url: settings.popup_image_url,
        popup_btn1_text: settings.popup_btn1_text,
        popup_btn1_url: settings.popup_btn1_url,
        popup_btn2_text: settings.popup_btn2_text,
        popup_btn2_url: settings.popup_btn2_url,
        popup_frequency: parseInt(settings.popup_frequency, 10) || 0,
      };

      const { error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', 1);

      if (error) {
        // If the table doesn't have the popup columns yet, fallback to basic settings and save popup to localStorage
        if (
          error.code === 'PGRST204' ||
          error.message?.includes('column') ||
          error.message?.includes('schema cache')
        ) {
          console.warn(
            'Popup columns missing in Supabase settings table. Falling back to basic settings...',
            error
          );
          const { error: basicErr } = await supabase
            .from('settings')
            .update({
              announcement_text: settings.announcement_text,
              show_announcement: settings.show_announcement,
              enforce_min_entry_rule: settings.enforce_min_entry_rule,
              admin_pin: settings.admin_pin,
            })
            .eq('id', 1);

          if (basicErr) throw basicErr;

          localStorage.setItem(
            'sargolsav_admin_popup_settings',
            JSON.stringify({
              is_popup_active: settings.is_popup_active,
              popup_heading: settings.popup_heading,
              popup_message: settings.popup_message,
              popup_image_url: settings.popup_image_url,
              popup_btn1_text: settings.popup_btn1_text,
              popup_btn1_url: settings.popup_btn1_url,
              popup_btn2_text: settings.popup_btn2_text,
              popup_btn2_url: settings.popup_btn2_url,
              popup_frequency: settings.popup_frequency,
            })
          );

          setToast({
            message:
              'Basic settings saved. (Notice: Run add_popup_settings.sql in Supabase SQL Editor to sync to database).',
            type: 'warning',
          });
          return;
        }
        throw error;
      }

      // Also mirror to localStorage
      localStorage.setItem(
        'sargolsav_admin_popup_settings',
        JSON.stringify({
          is_popup_active: settings.is_popup_active,
          popup_heading: settings.popup_heading,
          popup_message: settings.popup_message,
          popup_image_url: settings.popup_image_url,
          popup_btn1_text: settings.popup_btn1_text,
          popup_btn1_url: settings.popup_btn1_url,
          popup_btn2_text: settings.popup_btn2_text,
          popup_btn2_url: settings.popup_btn2_url,
          popup_frequency: settings.popup_frequency,
        })
      );

      logger.success('SETTINGS_UPDATE', 'Updated settings and popup configuration');

      setToast({
        message: 'Settings and Global Popup saved successfully!',
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

  // Dedicated Save Action for Global Popup Notice
  const handleSavePopupSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        is_popup_active: Boolean(settings.is_popup_active),
        popup_heading: settings.popup_heading ? settings.popup_heading.trim() : null,
        popup_message: settings.popup_message ? settings.popup_message.trim() : null,
        popup_image_url: settings.popup_image_url ? settings.popup_image_url.trim() : null,
        popup_btn1_text: settings.popup_btn1_text ? settings.popup_btn1_text.trim() : null,
        popup_btn1_url: settings.popup_btn1_url ? settings.popup_btn1_url.trim() : null,
        popup_btn2_text: settings.popup_btn2_text ? settings.popup_btn2_text.trim() : null,
        popup_btn2_url: settings.popup_btn2_url ? settings.popup_btn2_url.trim() : null,
        popup_frequency: parseInt(settings.popup_frequency, 10) >= 0 ? parseInt(settings.popup_frequency, 10) : 1,
      };

      const { error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', 1);

      if (error) {
        throw error;
      }

      logger.success('POPUP_SETTINGS_UPDATE', 'Updated global popup notice settings in Supabase', payload);

      setToast({
        message: 'Popup settings saved successfully!',
        type: 'success',
      });
      setTimeout(() => {
        setToast({ message: '', type: 'success' });
      }, 3500);
    } catch (err) {
      console.error('Error saving popup settings:', err);
      logger.error('POPUP_SETTINGS_UPDATE', `Save failed: ${err.message}`);
      setToast({
        message: `Failed to save popup settings: ${err.message || 'Please check network and try again.'}`,
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
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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

                {/* 4. Public Championships Visibility (Lock / Unlock) & Notice Customization */}
                <div className="p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 pr-2">
                      <label
                        className="text-sm font-bold text-[#1B254B] flex items-center gap-1.5"
                      >
                        {settings.is_championships_locked !== false ? (
                          <Lock className="w-4 h-4 text-amber-700" />
                        ) : (
                          <Unlock className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>Public Championships Visibility (Lock / Unlock)</span>
                      </label>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        When <strong>LOCKED</strong> (default), Overall Madrasa Podiums, Category Standings, and Individual Champions are hidden on the public site with a verification notice. Item-wise results and resources remain completely open.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePublicChampLock}
                      disabled={isTogglingChampLock}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md border shrink-0 ${
                        settings.is_championships_locked !== false
                          ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 border-amber-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                      }`}
                    >
                      {isTogglingChampLock ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : settings.is_championships_locked !== false ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {settings.is_championships_locked !== false
                          ? '🔒 Public Championships: LOCKED (Click to Unlock)'
                          : '🔓 Public Championships: UNLOCKED (Click to Lock)'}
                      </span>
                    </button>
                  </div>

                  {/* Customized Lock Notice Heading & Subtitle */}
                  <div className="pt-3 border-t border-amber-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1B254B] flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                        <span>Customize Lock Screen Message (Displayed on public site when locked)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveLockNotice}
                        disabled={isSavingLockMessage}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1B254B] hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 self-end sm:self-auto"
                      >
                        {isSavingLockMessage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F26430]" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>💾 Save Message</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Lock Title / Heading Input:
                        </label>
                        <input
                          type="text"
                          value={lockTitleInput}
                          onChange={(e) => setLockTitleInput(e.target.value)}
                          placeholder="⏳ Fetching Overall & Championship Results..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Lock Subtitle / Description Input (Multi-line supported):
                        </label>
                        <textarea
                          rows={2}
                          value={lockMessageInput}
                          onChange={(e) => setLockMessageInput(e.target.value)}
                          placeholder="Final championship standings are currently being verified..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Admin PIN */}
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

            {/* Global Popup Notice Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Bell className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#1B254B]">
                      Global Popup Notice
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage the high-priority announcement modal displayed on the public portal (/) with frequency controls and action buttons.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPopupPreview(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Preview how the popup looks to visitors"
                  >
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* 1. Toggle switch: Enable Public Popup (is_popup_active) */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <div className="space-y-0.5 pr-4">
                    <label
                      htmlFor="is_popup_active"
                      className="text-sm font-bold text-[#1B254B] cursor-pointer flex items-center gap-2"
                    >
                      <span>Enable Public Popup</span>
                      {settings.is_popup_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Active Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </label>
                    <p className="text-xs text-slate-600">
                      When turned ON, visitors on the public portal will be shown this announcement modal according to the frequency rule.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    id="is_popup_active"
                    aria-checked={settings.is_popup_active}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        is_popup_active: !prev.is_popup_active,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#F26430] ${
                      settings.is_popup_active ? 'bg-[#16A34A]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.is_popup_active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Text Input: Popup Heading (popup_heading) */}
                <div className="space-y-2">
                  <label htmlFor="popup_heading" className="text-sm font-bold text-[#1B254B] block">
                    Popup Heading
                  </label>
                  <input
                    id="popup_heading"
                    type="text"
                    value={settings.popup_heading}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, popup_heading: e.target.value }))
                    }
                    placeholder="e.g. Off-Stage Results Live!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#1B254B] font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                  />
                </div>

                {/* 3. Textarea: Popup Message (popup_message) */}
                <div className="space-y-2">
                  <label htmlFor="popup_message" className="text-sm font-bold text-[#1B254B] block">
                    Popup Message
                  </label>
                  <textarea
                    id="popup_message"
                    rows={4}
                    value={settings.popup_message}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, popup_message: e.target.value }))
                    }
                    placeholder="Enter announcement details, congratulations note, or urgent instructions..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                  />
                </div>

                {/* 4. Text Input: Header Image URL (Optional) (popup_image_url) */}
                <div className="space-y-3">
                  <label htmlFor="popup_image_url" className="text-sm font-bold text-[#1B254B] flex items-center justify-between">
                    <span>Header Image URL (Optional)</span>
                    <span className="text-xs font-normal text-slate-500">Renders flush across top of modal</span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="relative">
                        <input
                          id="popup_image_url"
                          type="url"
                          value={settings.popup_image_url}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, popup_image_url: e.target.value }))
                          }
                          placeholder="Paste image URL (https://...)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] focus:border-transparent transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Or select a file from your device:</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>

                      {settings.popup_image_url && (
                        <button
                          type="button"
                          onClick={() => setSettings((prev) => ({ ...prev, popup_image_url: '' }))}
                          className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Small Live Image Preview */}
                  {settings.popup_image_url && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Image Preview:</p>
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-xs relative shadow-inner">
                        <img
                          src={settings.popup_image_url}
                          alt="Header Preview"
                          className="w-full max-h-36 object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Number Input: Display Frequency (popup_frequency) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label htmlFor="popup_frequency" className="text-sm font-bold text-[#1B254B]">
                        Display Frequency
                      </label>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[11px]">
                          0 = Only once per device | 1 = Every visit | 3 = Every 3rd visit
                        </code>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Frequency:</span>
                      <input
                        id="popup_frequency"
                        type="number"
                        min={0}
                        max={100}
                        value={settings.popup_frequency}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            popup_frequency: parseInt(e.target.value, 10) >= 0 ? parseInt(e.target.value, 10) : 0,
                          }))
                        }
                        className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center text-sm font-bold text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
                      />
                    </div>
                  </div>

                  {/* Frequency Explanation Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div
                      className={`p-2 rounded-xl border transition-all ${
                        Number(settings.popup_frequency) === 0
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <p className="font-bold">0 = Only once per device</p>
                      <p className="text-[11px] text-slate-500">Shows once forever per announcement version.</p>
                    </div>
                    <div
                      className={`p-2 rounded-xl border transition-all ${
                        Number(settings.popup_frequency) === 1
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <p className="font-bold">1 = Every visit</p>
                      <p className="text-[11px] text-slate-500">Shows on every page visit / refresh.</p>
                    </div>
                    <div
                      className={`p-2 rounded-xl border transition-all ${
                        Number(settings.popup_frequency) > 1
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <p className="font-bold">{settings.popup_frequency || 3} = Every Nth visit</p>
                      <p className="text-[11px] text-slate-500">
                        Shows every {settings.popup_frequency || 3} visits (1st, {Number(settings.popup_frequency || 3) + 1}th...).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6. Two Button Config rows */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Two Button Config (Optional Actions)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Row 1: Button 1 Text & Button 1 Link URL */}
                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        <span>Button 1 (Primary Action)</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Button 1 Text
                        </label>
                        <input
                          type="text"
                          value={settings.popup_btn1_text}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, popup_btn1_text: e.target.value }))
                          }
                          placeholder="e.g. View Junior Results"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1B254B] font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Button 1 Link URL
                        </label>
                        <input
                          type="text"
                          value={settings.popup_btn1_url}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, popup_btn1_url: e.target.value }))
                          }
                          placeholder="e.g. /poster or https://instagram.com/..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    {/* Row 2: Button 2 Text & Button 2 Link URL */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Button 2 (Secondary Action)</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Button 2 Text
                        </label>
                        <input
                          type="text"
                          value={settings.popup_btn2_text}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, popup_btn2_text: e.target.value }))
                          }
                          placeholder="e.g. Download Item Schedule"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1B254B] font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Button 2 Link URL
                        </label>
                        <input
                          type="text"
                          value={settings.popup_btn2_url}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, popup_btn2_url: e.target.value }))
                          }
                          placeholder="e.g. /#resources or https://..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Action Row: 💾 Save Popup Settings */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPopupPreview(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Preview Modal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePopupSettings}
                    disabled={isSubmitting || isLoadingSettings}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#1B254B] text-white hover:bg-navy-800 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>💾 Save Popup Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Madrasa to Unit Mapper Section */}
            <MadrasaUnitMapper
              onShowToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
            />

            {/* System Diagnostics & Activity Console Panel (Phase 2) */}
            <DiagnosticsConsole />
          </div>
        )}

        {/* Analytics Tab (Live Visitors, Timeline Graph, Leaderboard, Posters) */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            onShowToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          />
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
        {activeTab === 'championships' && (
          <ChampionshipsTab
            isAdmin={true}
            lockTitle={lockTitleInput}
            lockMessage={lockMessageInput}
          />
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <AdminResourceManager
            onShowToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          />
        )}
      </main>

      {/* Admin Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4">
        <div className="max-w-6xl mx-auto">
          <DeveloperFooter />
        </div>
      </footer>

      {/* Live Preview Modal for Announcement Popup */}
      {showPopupPreview && (
        <GlobalAnnouncementModal
          isOpen={showPopupPreview}
          onClose={() => setShowPopupPreview(false)}
          popupData={{
            heading: settings.popup_heading || 'Sample Announcement Heading',
            message:
              settings.popup_message ||
              'This is a live preview of how your announcement message will appear to visitors on the Sargolsav public portal.',
            imageUrl: settings.popup_image_url,
            btn1Text: settings.popup_btn1_text,
            btn1Url: settings.popup_btn1_url,
            btn2Text: settings.popup_btn2_text,
            btn2Url: settings.popup_btn2_url,
          }}
        />
      )}
    </div>
  );
}
