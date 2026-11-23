import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { computeUnitStandings, computeIndividualChampionship } from '../lib/championshipEngine';
import Podium from './Podium';
import { downloadChampionshipPdf } from '../lib/pdfGenerator';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  Users,
  User,
  RotateCw,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Unlock,
  Edit3,
  Plus,
  Save,
  Undo2,
  Download,
  Trash2,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'KIDS', labelEn: 'Kids', labelMl: 'കിഡ്സ്' },
  { id: 'CHILDREN', labelEn: 'Children', labelMl: 'ചിൽഡ്രൻ' },
  { id: 'SUB JUNIOR', labelEn: 'Sub Junior', labelMl: 'സബ് ജൂനിയർ' },
  { id: 'JUNIOR', labelEn: 'Junior', labelMl: 'ജൂനിയർ' },
  { id: 'TEENS', labelEn: 'Teens', labelMl: 'ടീൻസ്' },
];

export default function ChampionshipsTab({
  isAdmin = false,
  isChampLocked: propIsChampLocked,
  onToggleLock,
}) {
  // Sub-navigation view: 'OVERALL_UNIT' | 'CATEGORY_UNIT' | 'INDIVIDUAL'
  const [activeView, setActiveView] = useState('OVERALL_UNIT');
  const [selectedCategory, setSelectedCategory] = useState('KIDS');

  // Lock State: DEFAULT TO TRUE (LOCKED)
  const [isChampLocked, setIsChampLocked] = useState(() => {
    if (propIsChampLocked !== undefined) return propIsChampLocked;
    const cachedLock = localStorage.getItem('sargolsav_championships_locked');
    if (cachedLock !== null) return cachedLock === 'true';
    return true; // Strict default: LOCKED
  });

  // Raw database data
  const [items, setItems] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Manual Overrides State
  const [manualOverrides, setManualOverrides] = useState(() => {
    try {
      const cached = localStorage.getItem('sargolsav_manual_overrides');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Admin Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableOverallUnits, setEditableOverallUnits] = useState([]);
  const [editableCategoryUnits, setEditableCategoryUnits] = useState({});
  const [editableIndividualChampions, setEditableIndividualChampions] = useState({});
  const [isSavingOverrides, setIsSavingOverrides] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Show transient toast
  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Sync propIsChampLocked when changed from parent
  useEffect(() => {
    if (propIsChampLocked !== undefined) {
      setIsChampLocked(propIsChampLocked);
    }
  }, [propIsChampLocked]);

  // Fetch settings (lock state & manual overrides) from Supabase
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        // Evaluate lock status strictly
        const lockedFromDb =
          data.is_championships_locked !== false &&
          data.manual_overrides?.is_locked !== false;

        setIsChampLocked(lockedFromDb);
        localStorage.setItem('sargolsav_championships_locked', String(lockedFromDb));

        // Evaluate manual overrides
        let overridesObj = data.manual_overrides || null;
        if (!overridesObj && data.notice_text && data.notice_text.startsWith('JSON:{"type":"MANUAL_OVERRIDES"')) {
          try {
            overridesObj = JSON.parse(data.notice_text.replace('JSON:', ''))?.data || null;
          } catch {
            // ignore
          }
        }
        if (overridesObj) {
          setManualOverrides(overridesObj);
          localStorage.setItem('sargolsav_manual_overrides', JSON.stringify(overridesObj));
        }
      }
    } catch (err) {
      console.warn('Error fetching settings for championships:', err);
    }
  }, []);

  // Fetch all published championship data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Fetch published items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('items')
        .select('code, name_ml, name_en, category, mode, is_published')
        .eq('is_published', true);

      if (itemsErr) throw itemsErr;
      setItems(itemsData || []);

      if (!itemsData || itemsData.length === 0) {
        setParticipations([]);
        setParticipants([]);
        setLastUpdated(new Date());
        return;
      }

      const publishedCodes = itemsData.map((i) => i.code);

      // 2. Fetch participations strictly for public columns
      const { data: partData, error: partErr } = await supabase
        .from('participations')
        .select('item_code, reg_no, rank, grade, points')
        .in('item_code', publishedCodes);

      if (partErr) throw partErr;
      setParticipations(partData || []);

      // 3. Fetch participants profiles
      if (partData && partData.length > 0) {
        const regNos = Array.from(new Set(partData.map((p) => p.reg_no)));
        const { data: pData, error: pErr } = await supabase
          .from('participants')
          .select('reg_no, name, category, unit, madrasa')
          .in('reg_no', regNos);

        if (pErr) throw pErr;
        setParticipants(pData || []);
      } else {
        setParticipants([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching championship data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchData();
  }, [fetchSettings, fetchData]);

  // Compute Auto-Calculated Overall Unit Standings
  const autoOverallUnitStandings = useMemo(() => {
    return computeUnitStandings(participations, participants, items, null);
  }, [participations, participants, items]);

  // Compute Auto-Calculated Category-wise Unit Standings
  const autoCategoryUnitStandings = useMemo(() => {
    return computeUnitStandings(participations, participants, items, selectedCategory);
  }, [participations, participants, items, selectedCategory]);

  // Compute Auto-Calculated Individual Championship Standings
  const autoIndividualData = useMemo(() => {
    return computeIndividualChampionship(participations, participants, items, selectedCategory);
  }, [participations, participants, items, selectedCategory]);

  // Apply Manual Overrides to Overall Unit Standings
  const overallUnitStandings = useMemo(() => {
    if (manualOverrides?.overallUnits && Array.isArray(manualOverrides.overallUnits) && manualOverrides.overallUnits.length > 0) {
      const sorted = [...manualOverrides.overallUnits].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
      let currentRank = 1;
      return sorted.map((item, idx) => {
        if (idx > 0 && (Number(item.totalPoints) || 0) < (Number(sorted[idx - 1].totalPoints) || 0)) {
          currentRank = idx + 1;
        }
        return {
          ...item,
          position: currentRank,
          totalPoints: Number(item.totalPoints) || 0,
          rank1Count: Number(item.rank1Count) || 0,
          rank2Count: Number(item.rank2Count) || 0,
          rank3Count: Number(item.rank3Count) || 0,
          gradeACount: Number(item.gradeACount) || 0,
          gradeBCount: Number(item.gradeBCount) || 0,
          gradeCCount: Number(item.gradeCCount) || 0,
          categoryPoints: item.categoryPoints || {},
          breakdown: item.breakdown || [],
        };
      });
    }
    return autoOverallUnitStandings;
  }, [manualOverrides, autoOverallUnitStandings]);

  // Apply Manual Overrides to Category-wise Unit Standings
  const categoryUnitStandings = useMemo(() => {
    if (
      manualOverrides?.categoryUnits?.[selectedCategory] &&
      Array.isArray(manualOverrides.categoryUnits[selectedCategory]) &&
      manualOverrides.categoryUnits[selectedCategory].length > 0
    ) {
      const list = manualOverrides.categoryUnits[selectedCategory];
      const sorted = [...list].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
      let currentRank = 1;
      return sorted.map((item, idx) => {
        if (idx > 0 && (Number(item.totalPoints) || 0) < (Number(sorted[idx - 1].totalPoints) || 0)) {
          currentRank = idx + 1;
        }
        return {
          ...item,
          position: currentRank,
          totalPoints: Number(item.totalPoints) || 0,
          rank1Count: Number(item.rank1Count) || 0,
          rank2Count: Number(item.rank2Count) || 0,
          rank3Count: Number(item.rank3Count) || 0,
          breakdown: item.breakdown || [],
        };
      });
    }

    // Secondary fallback: derive from overallUnits if categoryPoints exists
    if (manualOverrides?.overallUnits && Array.isArray(manualOverrides.overallUnits) && manualOverrides.overallUnits.length > 0) {
      const filtered = manualOverrides.overallUnits
        .filter((u) => u.categoryPoints && Number(u.categoryPoints[selectedCategory]) > 0)
        .map((u) => ({
          unit: u.unit,
          totalPoints: Number(u.categoryPoints[selectedCategory]) || 0,
          rank1Count: Number(u.rank1Count) || 0,
          rank2Count: Number(u.rank2Count) || 0,
          rank3Count: Number(u.rank3Count) || 0,
          breakdown: [],
        }));
      if (filtered.length > 0) {
        filtered.sort((a, b) => b.totalPoints - a.totalPoints);
        let currentRank = 1;
        return filtered.map((item, idx) => {
          if (idx > 0 && item.totalPoints < filtered[idx - 1].totalPoints) currentRank = idx + 1;
          return { ...item, position: currentRank };
        });
      }
    }

    return autoCategoryUnitStandings;
  }, [manualOverrides, selectedCategory, autoCategoryUnitStandings]);

  // Apply Manual Overrides to Individual Champions
  const individualData = useMemo(() => {
    if (
      manualOverrides?.individualChampions?.[selectedCategory] &&
      Array.isArray(manualOverrides.individualChampions[selectedCategory]) &&
      manualOverrides.individualChampions[selectedCategory].length > 0
    ) {
      const contenders = manualOverrides.individualChampions[selectedCategory];
      const qualified = contenders.filter(
        (c) => c.isQualified !== false && (Number(c.singlePoints) >= 16 || c.position === 1)
      );
      return {
        qualifiedChampions: qualified.length > 0 ? qualified : contenders.slice(0, 1),
        contenders,
      };
    }
    return autoIndividualData;
  }, [manualOverrides, selectedCategory, autoIndividualData]);

  // Populate local edit state when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      // Overall units
      if (manualOverrides?.overallUnits && manualOverrides.overallUnits.length > 0) {
        setEditableOverallUnits(JSON.parse(JSON.stringify(manualOverrides.overallUnits)));
      } else {
        setEditableOverallUnits(JSON.parse(JSON.stringify(autoOverallUnitStandings)));
      }

      // Category units
      const initialCatUnits = {};
      CATEGORIES.forEach((cat) => {
        if (manualOverrides?.categoryUnits?.[cat.id]) {
          initialCatUnits[cat.id] = JSON.parse(JSON.stringify(manualOverrides.categoryUnits[cat.id]));
        } else {
          const autoComputed = computeUnitStandings(participations, participants, items, cat.id);
          initialCatUnits[cat.id] = JSON.parse(JSON.stringify(autoComputed));
        }
      });
      setEditableCategoryUnits(initialCatUnits);

      // Individual Champions
      const initialInd = {};
      CATEGORIES.forEach((cat) => {
        if (manualOverrides?.individualChampions?.[cat.id]) {
          initialInd[cat.id] = JSON.parse(JSON.stringify(manualOverrides.individualChampions[cat.id]));
        } else {
          const autoInd = computeIndividualChampionship(participations, participants, items, cat.id);
          initialInd[cat.id] = JSON.parse(JSON.stringify(autoInd.contenders.slice(0, 3)));
        }
      });
      setEditableIndividualChampions(initialInd);
    }
  }, [isEditMode, manualOverrides, autoOverallUnitStandings, participations, participants, items]);

  // Toggle Public Championships Lock (Feature 1)
  const handleToggleChampLock = async () => {
    setIsTogglingLock(true);
    const newLockState = !isChampLocked;
    try {
      // 1. Update Supabase settings
      const payload = {
        is_championships_locked: newLockState,
        manual_overrides: {
          ...(manualOverrides || {}),
          is_locked: newLockState,
        },
      };

      const { error } = await supabase.from('settings').update(payload).eq('id', 1);

      if (error) {
        // Fallback update without column if schema caching issues occur
        console.warn('Fallback updating manual_overrides with lock state...', error.message);
        await supabase
          .from('settings')
          .update({
            manual_overrides: {
              ...(manualOverrides || {}),
              is_locked: newLockState,
            },
          })
          .eq('id', 1);
      }

      // 2. Update local state & localStorage
      setIsChampLocked(newLockState);
      localStorage.setItem('sargolsav_championships_locked', String(newLockState));

      if (onToggleLock) onToggleLock(newLockState);

      showToast(
        newLockState
          ? '🔒 Public Championships are now LOCKED from public view!'
          : '🔓 Public Championships are now UNLOCKED and visible to the public!',
        'success'
      );
    } catch (err) {
      console.error('Error toggling championship lock:', err);
      // Fallback local update
      setIsChampLocked(newLockState);
      localStorage.setItem('sargolsav_championships_locked', String(newLockState));
      showToast(`Updated lock state locally (${newLockState ? 'LOCKED' : 'UNLOCKED'})`, 'info');
    } finally {
      setIsTogglingLock(false);
    }
  };

  // Save Manual Overrides to Supabase (Feature 3)
  const handleSaveOverrides = async () => {
    setIsSavingOverrides(true);
    try {
      const overridesPayload = {
        is_locked: isChampLocked,
        overallUnits: editableOverallUnits.map((u, i) => ({
          unit: (u.unit || `Madrasa ${i + 1}`).trim().toUpperCase(),
          totalPoints: Number(u.totalPoints) || 0,
          rank1Count: Number(u.rank1Count) || 0,
          rank2Count: Number(u.rank2Count) || 0,
          rank3Count: Number(u.rank3Count) || 0,
          gradeACount: Number(u.gradeACount) || 0,
          gradeBCount: Number(u.gradeBCount) || 0,
          gradeCCount: Number(u.gradeCCount) || 0,
          categoryPoints: u.categoryPoints || {},
        })),
        categoryUnits: editableCategoryUnits,
        individualChampions: editableIndividualChampions,
        updated_at: new Date().toISOString(),
      };

      // 1. Try updating settings.manual_overrides
      const { error } = await supabase
        .from('settings')
        .update({ manual_overrides: overridesPayload })
        .eq('id', 1);

      if (error) {
        console.warn('Direct column update failed, trying notice_text fallback:', error.message);
        // Fallback: encode into notice_text or local storage
        await supabase
          .from('settings')
          .update({
            notice_text: `JSON:{"type":"MANUAL_OVERRIDES","data":${JSON.stringify(overridesPayload)}}`,
          })
          .eq('id', 1);
      }

      // 2. Persist in localStorage and state
      setManualOverrides(overridesPayload);
      localStorage.setItem('sargolsav_manual_overrides', JSON.stringify(overridesPayload));
      setIsEditMode(false);
      showToast('💾 Championship Manual Overrides saved & published successfully!', 'success');
    } catch (err) {
      console.error('Error saving manual overrides:', err);
      // Fallback save to localStorage
      const overridesPayload = {
        is_locked: isChampLocked,
        overallUnits: editableOverallUnits,
        categoryUnits: editableCategoryUnits,
        individualChampions: editableIndividualChampions,
      };
      setManualOverrides(overridesPayload);
      localStorage.setItem('sargolsav_manual_overrides', JSON.stringify(overridesPayload));
      setIsEditMode(false);
      showToast('Saved overrides locally (offline fallback)', 'info');
    } finally {
      setIsSavingOverrides(false);
    }
  };

  // Reset Overrides back to Auto-Calculated (Feature 3)
  const handleResetOverrides = async () => {
    if (!window.confirm('Are you sure you want to discard manual overrides and reset to auto-calculated scores?')) {
      return;
    }
    setIsSavingOverrides(true);
    try {
      await supabase
        .from('settings')
        .update({
          manual_overrides: null,
        })
        .eq('id', 1);

      setManualOverrides(null);
      localStorage.removeItem('sargolsav_manual_overrides');
      setIsEditMode(false);
      showToast('🔄 Reset to auto-calculated standings successfully!', 'success');
    } catch (err) {
      console.error('Error resetting overrides:', err);
      setManualOverrides(null);
      localStorage.removeItem('sargolsav_manual_overrides');
      setIsEditMode(false);
      showToast('Reset local overrides', 'info');
    } finally {
      setIsSavingOverrides(false);
    }
  };

  // Add Custom Row
  const handleAddCustomRow = () => {
    if (activeView === 'OVERALL_UNIT') {
      setEditableOverallUnits((prev) => [
        ...prev,
        {
          unit: 'NEW MADRASA',
          totalPoints: 0,
          rank1Count: 0,
          rank2Count: 0,
          rank3Count: 0,
          gradeACount: 0,
          gradeBCount: 0,
          gradeCCount: 0,
          categoryPoints: { KIDS: 0, CHILDREN: 0, 'SUB JUNIOR': 0, JUNIOR: 0, TEENS: 0 },
        },
      ]);
    } else if (activeView === 'CATEGORY_UNIT') {
      setEditableCategoryUnits((prev) => ({
        ...prev,
        [selectedCategory]: [
          ...(prev[selectedCategory] || []),
          {
            unit: 'NEW MADRASA',
            totalPoints: 0,
            rank1Count: 0,
            rank2Count: 0,
            rank3Count: 0,
          },
        ],
      }));
    } else if (activeView === 'INDIVIDUAL') {
      setEditableIndividualChampions((prev) => ({
        ...prev,
        [selectedCategory]: [
          ...(prev[selectedCategory] || []),
          {
            position: (prev[selectedCategory]?.length || 0) + 1,
            regNo: '',
            name: 'STUDENT NAME',
            unit: 'MADRASA',
            singlePoints: 0,
            groupTieBreakerPoints: 0,
            rank1Count: 0,
            isQualified: true,
          },
        ],
      }));
    }
  };

  // Download Championship PDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const filename = `Sargolsav_2026_${activeView}_Standings.pdf`;
      await downloadChampionshipPdf('championship-pdf-template', filename);
      showToast('Official Championship PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate Championship PDF:', err);
      showToast(`Error generating PDF: ${err.message}`, 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // PUBLIC LOCKED SCREEN: (Feature 1)
  // If not admin AND public lock is enabled, display the fetching/verification card
  if (!isAdmin && isChampLocked) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 text-center space-y-4 shadow-xs max-w-2xl mx-auto my-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#F26430] mx-auto mb-3" />
          <h3 className="text-lg sm:text-xl font-bold text-[#1B254B]">
            ⏳ Fetching Overall & Championship Results...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Final championship standings are currently being verified. Please check back later! (You can still view all Item-wise Results and Resources).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-md text-xs sm:text-sm font-bold animate-in slide-in-from-top duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-sky-50 border border-sky-200 text-sky-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ADMIN CONTROLS BAR (Only visible to authenticated admin) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-[#1B254B] to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-sm sm:text-base text-white">
                  Championship Control Panel
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                Manage public visibility, manual points override, and official championship printouts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Feature 1: Public Lock Toggle Button */}
              <button
                type="button"
                onClick={handleToggleChampLock}
                disabled={isTogglingLock}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md border ${
                  isChampLocked
                    ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400'
                }`}
                title="Toggle public visibility of Championship standings"
              >
                {isTogglingLock ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isChampLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
                <span>
                  {isChampLocked
                    ? '🔒 Public Championships: LOCKED (Click to Unlock)'
                    : '🔓 Public Championships: UNLOCKED (Click to Lock)'}
                </span>
              </button>

              {/* Feature 3: Edit Standings Toggle Button */}
              <button
                type="button"
                onClick={() => setIsEditMode((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                  isEditMode
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Exit Edit Mode' : '✏️ Edit / Manual Override Standings'}</span>
              </button>

              {/* Championship PDF Download Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#F26430] hover:bg-orange-600 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                title="Download high-resolution official Championship Standings PDF"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>📥 Download PDF</span>
              </button>
            </div>
          </div>

          {/* Edit Mode Active Banner */}
          {isEditMode && (
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-400/10 p-3 rounded-2xl border border-amber-400/30">
              <div className="flex items-center gap-2 text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Manual Override Mode Active:</strong> You can edit points, medal counts, and custom madrasas directly below.
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleAddCustomRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>➕ Add Custom Row</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveOverrides}
                  disabled={isSavingOverrides}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingOverrides ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>💾 Save Overrides</span>
                </button>

                {manualOverrides && (
                  <button
                    type="button"
                    onClick={handleResetOverrides}
                    disabled={isSavingOverrides}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 cursor-pointer"
                    title="Clear overrides and restore auto-calculated scoring"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>🔄 Reset</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Sub-navigation tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-2 sm:p-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView('OVERALL_UNIT')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'OVERALL_UNIT'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Overall Madrasa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('CATEGORY_UNIT')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'CATEGORY_UNIT'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Category-wise Madrasas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('INDIVIDUAL')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'INDIVIDUAL'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Crown className="w-4 h-4 text-[#F26430]" />
            <span>Individual Champions</span>
          </button>
        </div>

        {/* Live Refresh & Public Download Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto px-2">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#1B254B] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Live Standings"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F26430]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Category selector for CATEGORY_UNIT and INDIVIDUAL views */}
      {(activeView === 'CATEGORY_UNIT' || activeView === 'INDIVIDUAL') && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F26430] text-white shadow-sm scale-102'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-ml mr-1.5">{cat.labelMl}</span>
                <span className="opacity-80 uppercase text-[10px]">({cat.labelEn})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#F26430]" />
          <p className="text-sm font-semibold text-slate-600">
            Calculating Live Standings & Deduplicating Scores...
          </p>
        </div>
      ) : items.length === 0 && !manualOverrides ? (
        /* Empty published items state */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-[#1B254B]">No Results Published Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            As soon as the Tabulation Committee verifies and publishes the first competition results,
            live unit standings, category podiums, and Kalaprathibha contenders will appear here instantly!
          </p>
        </div>
      ) : (
        <>
          {/* VIEW 1: OVERALL UNIT CHAMPIONSHIP */}
          {activeView === 'OVERALL_UNIT' && (
            <div className="space-y-6">
              {/* Podium (Passing onItemClick=null to disable clicking) */}
              <Podium
                standings={overallUnitStandings}
                onItemClick={null}
                type="UNIT"
              />

              {/* Standings Table / Edit Mode Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                      Overall Madrasa Points Table
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deduplicated group performance scores
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {manualOverrides?.overallUnits && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Manual Override Applied
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {(isEditMode ? editableOverallUnits : overallUnitStandings).length} Madrasas Active
                    </span>
                  </div>
                </div>

                {isEditMode ? (
                  /* INLINE EDITABLE OVERALL TABLE */
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50 text-amber-950 uppercase font-bold text-[10px] tracking-wider border-b border-amber-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[160px]">Madrasa Name</th>
                          <th className="py-2.5 px-2 text-center w-16">Kids</th>
                          <th className="py-2.5 px-2 text-center w-16">Children</th>
                          <th className="py-2.5 px-2 text-center w-16">Sub Jr</th>
                          <th className="py-2.5 px-2 text-center w-16">Junior</th>
                          <th className="py-2.5 px-2 text-center w-16">Teens</th>
                          <th className="py-2.5 px-2 text-center w-14">🥇 1st</th>
                          <th className="py-2.5 px-2 text-center w-14">🥈 2nd</th>
                          <th className="py-2.5 px-2 text-center w-14">🥉 3rd</th>
                          <th className="py-2.5 px-2 text-center w-24">Grades (A/B/C)</th>
                          <th className="py-2.5 px-3 text-right w-24">Total Pts</th>
                          <th className="py-2.5 px-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {editableOverallUnits.map((unit, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={unit.unit || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableOverallUnits((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, unit: val } : row))
                                  );
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#1B254B] focus:bg-white"
                              />
                            </td>
                            {/* Category Points */}
                            {['KIDS', 'CHILDREN', 'SUB JUNIOR', 'JUNIOR', 'TEENS'].map((catKey) => (
                              <td key={catKey} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={unit.categoryPoints?.[catKey] ?? ''}
                                  onChange={(e) => {
                                    const num = Number(e.target.value) || 0;
                                    setEditableOverallUnits((prev) =>
                                      prev.map((row, i) => {
                                        if (i !== idx) return row;
                                        const nextCats = { ...(row.categoryPoints || {}), [catKey]: num };
                                        return { ...row, categoryPoints: nextCats };
                                      })
                                    );
                                  }}
                                  className="w-14 text-center bg-slate-50 border border-slate-200 rounded-md py-1 text-xs font-mono font-bold"
                                />
                              </td>
                            ))}
                            {/* 1st, 2nd, 3rd Counts */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank1Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableOverallUnits((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, rank1Count: num } : row))
                                  );
                                }}
                                className="w-12 text-center bg-amber-50 border border-amber-200 rounded-md py-1 text-xs font-mono font-bold text-amber-900"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank2Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableOverallUnits((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, rank2Count: num } : row))
                                  );
                                }}
                                className="w-12 text-center bg-slate-100 border border-slate-300 rounded-md py-1 text-xs font-mono font-bold text-slate-800"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank3Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableOverallUnits((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, rank3Count: num } : row))
                                  );
                                }}
                                className="w-12 text-center bg-orange-50 border border-orange-200 rounded-md py-1 text-xs font-mono font-bold text-orange-900"
                              />
                            </td>
                            {/* Grades A/B/C */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1 font-mono">
                                <input
                                  type="number"
                                  min="0"
                                  title="Grade A Count"
                                  value={unit.gradeACount ?? ''}
                                  onChange={(e) => {
                                    const num = Number(e.target.value) || 0;
                                    setEditableOverallUnits((prev) =>
                                      prev.map((row, i) => (i === idx ? { ...row, gradeACount: num } : row))
                                    );
                                  }}
                                  className="w-8 text-center bg-slate-50 border border-slate-200 rounded py-0.5 text-[11px]"
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  min="0"
                                  title="Grade B Count"
                                  value={unit.gradeBCount ?? ''}
                                  onChange={(e) => {
                                    const num = Number(e.target.value) || 0;
                                    setEditableOverallUnits((prev) =>
                                      prev.map((row, i) => (i === idx ? { ...row, gradeBCount: num } : row))
                                    );
                                  }}
                                  className="w-8 text-center bg-slate-50 border border-slate-200 rounded py-0.5 text-[11px]"
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  min="0"
                                  title="Grade C Count"
                                  value={unit.gradeCCount ?? ''}
                                  onChange={(e) => {
                                    const num = Number(e.target.value) || 0;
                                    setEditableOverallUnits((prev) =>
                                      prev.map((row, i) => (i === idx ? { ...row, gradeCCount: num } : row))
                                    );
                                  }}
                                  className="w-8 text-center bg-slate-50 border border-slate-200 rounded py-0.5 text-[11px]"
                                />
                              </div>
                            </td>
                            {/* Total Points */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={unit.totalPoints ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableOverallUnits((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, totalPoints: num } : row))
                                  );
                                }}
                                className="w-18 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-black text-[#1B254B] focus:bg-white"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditableOverallUnits((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                title="Delete Row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* NORMAL STANDINGS TABLE (Feature 2: Non-clickable rows, no item breakdown) */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">Rank</th>
                          <th className="py-3 px-4">Madrasa</th>
                          <th className="py-3 px-3 text-center w-20">🥇 1st</th>
                          <th className="py-3 px-3 text-center w-20">🥈 2nd</th>
                          <th className="py-3 px-3 text-center w-20">🥉 3rd</th>
                          <th className="py-3 px-3 text-center w-32 hidden sm:table-cell">Grades (A/B/C)</th>
                          <th className="py-3 px-6 text-right w-28">Total Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {overallUnitStandings.map((unit) => (
                          <tr
                            key={unit.unit}
                            className="hover:bg-amber-50/20 transition-colors"
                          >
                            <td className="py-3.5 px-4 text-center">
                              {unit.position === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-xs">
                                  1
                                </span>
                              ) : unit.position === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black">
                                  2
                                </span>
                              ) : unit.position === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-700 text-white font-black">
                                  3
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-slate-500">
                                  #{unit.position}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#1B254B] text-sm">
                                {unit.unit}
                              </span>
                              {unit.breakdown && unit.breakdown.length > 0 && (
                                <span className="block text-[11px] text-slate-400 font-normal">
                                  {unit.breakdown.length} items scored
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                              {unit.rank1Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                              {unit.rank2Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-orange-800">
                              {unit.rank3Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-500 hidden sm:table-cell">
                              {unit.gradeACount || 0}/{unit.gradeBCount || 0}/{unit.gradeCCount || 0}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className="font-mono font-black text-base text-[#1B254B]">
                                {unit.totalPoints}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">pts</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: CATEGORY-WISE UNIT CHAMPIONSHIP */}
          {activeView === 'CATEGORY_UNIT' && (
            <div className="space-y-6">
              {/* Category Podium (onItemClick=null) */}
              <Podium
                standings={categoryUnitStandings}
                onItemClick={null}
                type="UNIT"
              />

              {/* Standings Table for Category */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                      {selectedCategory} Madrasa Points Table
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Points earned exclusively in {selectedCategory} items
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-[#F26430]">
                    {(isEditMode ? editableCategoryUnits[selectedCategory] || [] : categoryUnitStandings).length} Madrasas Scored
                  </span>
                </div>

                {isEditMode ? (
                  /* EDITABLE CATEGORY STANDINGS */
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50 text-amber-950 uppercase font-bold text-[10px] tracking-wider border-b border-amber-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Madrasa Name</th>
                          <th className="py-2.5 px-2 text-center w-20">🥇 1st</th>
                          <th className="py-2.5 px-2 text-center w-20">🥈 2nd</th>
                          <th className="py-2.5 px-2 text-center w-20">🥉 3rd</th>
                          <th className="py-2.5 px-4 text-right w-28">Points</th>
                          <th className="py-2.5 px-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(editableCategoryUnits[selectedCategory] || []).map((unit, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={unit.unit || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, unit: val } : row
                                    ),
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#1B254B] focus:bg-white"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank1Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, rank1Count: num } : row
                                    ),
                                  }));
                                }}
                                className="w-14 text-center bg-amber-50 border border-amber-200 rounded-md py-1 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank2Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, rank2Count: num } : row
                                    ),
                                  }));
                                }}
                                className="w-14 text-center bg-slate-100 border border-slate-300 rounded-md py-1 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={unit.rank3Count ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, rank3Count: num } : row
                                    ),
                                  }));
                                }}
                                className="w-14 text-center bg-orange-50 border border-orange-200 rounded-md py-1 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                value={unit.totalPoints ?? ''}
                                onChange={(e) => {
                                  const num = Number(e.target.value) || 0;
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, totalPoints: num } : row
                                    ),
                                  }));
                                }}
                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-black text-[#1B254B] focus:bg-white"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditableCategoryUnits((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].filter((_, i) => i !== idx),
                                  }))
                                }
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : categoryUnitStandings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No items published in {selectedCategory} category yet.
                  </div>
                ) : (
                  /* NORMAL CATEGORY STANDINGS (Feature 2: Non-clickable rows) */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">Rank</th>
                          <th className="py-3 px-4">Madrasa</th>
                          <th className="py-3 px-3 text-center w-20">🥇 1st</th>
                          <th className="py-3 px-3 text-center w-20">🥈 2nd</th>
                          <th className="py-3 px-3 text-center w-20">🥉 3rd</th>
                          <th className="py-3 px-6 text-right w-28">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {categoryUnitStandings.map((unit) => (
                          <tr
                            key={unit.unit}
                            className="hover:bg-amber-50/20 transition-colors"
                          >
                            <td className="py-3.5 px-4 text-center">
                              {unit.position === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-xs">
                                  1
                                </span>
                              ) : unit.position === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black">
                                  2
                                </span>
                              ) : unit.position === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-700 text-white font-black">
                                  3
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-slate-500">
                                  #{unit.position}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#1B254B] text-sm">
                                {unit.unit}
                              </span>
                              {unit.breakdown && unit.breakdown.length > 0 && (
                                <span className="block text-[11px] text-slate-400 font-normal">
                                  {unit.breakdown.length} items
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                              {unit.rank1Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                              {unit.rank2Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-orange-800">
                              {unit.rank3Count || 0}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className="font-mono font-black text-base text-[#1B254B]">
                                {unit.totalPoints}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">pts</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: INDIVIDUAL CHAMPIONS (KALAPRATHIBHA / TOP PERFORMERS) */}
          {activeView === 'INDIVIDUAL' && (
            <div className="space-y-6">
              {/* EDIT MODE: DIRECTLY EDIT TOP 3 WINNERS FOR CATEGORY */}
              {isEditMode ? (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-base text-[#1B254B]">
                        Edit Top 3 Individual Champions for {selectedCategory}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Directly adjust Rank 1, 2, and 3 Kalaprathibha contenders, Reg No, Points, and Madrasa name.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(editableIndividualChampions[selectedCategory] || []).map((champ, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Reg No</label>
                              <input
                                type="text"
                                value={champ.regNo || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableIndividualChampions((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, regNo: val } : row
                                    ),
                                  }));
                                }}
                                placeholder="e.g. 1001"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Student Name</label>
                              <input
                                type="text"
                                value={champ.name || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableIndividualChampions((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, name: val } : row
                                    ),
                                  }));
                                }}
                                placeholder="Student Full Name"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-[#1B254B]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Madrasa</label>
                              <input
                                type="text"
                                value={champ.unit || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditableIndividualChampions((prev) => ({
                                    ...prev,
                                    [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                      i === idx ? { ...row, unit: val } : row
                                    ),
                                  }));
                                }}
                                placeholder="Madrasa Name"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-[#1B254B]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Single Pts</label>
                            <input
                              type="number"
                              min="0"
                              value={champ.singlePoints ?? ''}
                              onChange={(e) => {
                                const num = Number(e.target.value) || 0;
                                setEditableIndividualChampions((prev) => ({
                                  ...prev,
                                  [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                    i === idx ? { ...row, singlePoints: num } : row
                                  ),
                                }));
                              }}
                              className="w-16 bg-white border border-slate-200 rounded-lg py-1 text-center text-xs font-mono font-black text-[#1B254B]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">🥇 Count</label>
                            <input
                              type="number"
                              min="0"
                              value={champ.rank1Count ?? ''}
                              onChange={(e) => {
                                const num = Number(e.target.value) || 0;
                                setEditableIndividualChampions((prev) => ({
                                  ...prev,
                                  [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                    i === idx ? { ...row, rank1Count: num } : row
                                  ),
                                }));
                              }}
                              className="w-14 bg-white border border-slate-200 rounded-lg py-1 text-center text-xs font-mono font-bold text-amber-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tie Pts</label>
                            <input
                              type="number"
                              min="0"
                              value={champ.groupTieBreakerPoints ?? ''}
                              onChange={(e) => {
                                const num = Number(e.target.value) || 0;
                                setEditableIndividualChampions((prev) => ({
                                  ...prev,
                                  [selectedCategory]: prev[selectedCategory].map((row, i) =>
                                    i === idx ? { ...row, groupTieBreakerPoints: num } : row
                                  ),
                                }));
                              }}
                              className="w-14 bg-white border border-slate-200 rounded-lg py-1 text-center text-xs font-mono text-slate-600"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setEditableIndividualChampions((prev) => ({
                                ...prev,
                                [selectedCategory]: prev[selectedCategory].filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600 p-1.5 mt-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Section A: Official Qualified Champions Banner */}
                  {individualData.qualifiedChampions.length > 0 ? (
                    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md uppercase tracking-wider border border-white/30">
                          <Crown className="w-4 h-4 text-yellow-200" />
                          <span>Official Category Champion (Manual Page 4)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {individualData.qualifiedChampions.map((champ) => (
                            <div
                              key={champ.regNo || champ.name}
                              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-white text-amber-600 flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                                👑
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-black text-white truncate">
                                  {champ.name}
                                </h4>
                                <p className="text-xs text-amber-100 font-semibold truncate">
                                  Madrasa: {champ.unit} {champ.regNo ? `• #${champ.regNo}` : ''}
                                </p>
                                <div className="mt-2 flex items-center gap-3 font-mono text-xs">
                                  <span className="bg-white/20 px-2 py-0.5 rounded font-bold">
                                    {champ.singlePoints} Single Pts
                                  </span>
                                  <span className="bg-white/20 px-2 py-0.5 rounded font-bold">
                                    {champ.rank1Count} First Ranks
                                  </span>
                                  {champ.groupTieBreakerPoints > 0 && (
                                    <span className="text-[10px] opacity-90">
                                      Tie-Breaker: +{champ.groupTieBreakerPoints}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Notice for Early Festival */
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-amber-900 flex items-start gap-3.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm">
                        <p className="font-bold text-[#1B254B]">
                          Official Champion Status Pending for {selectedCategory}
                        </p>
                        <p className="text-slate-600 mt-1 leading-relaxed">
                          Per Official Fest Manual Page 4, a participant must secure at least <strong>one 1st Rank</strong> in a Single item and accumulate <strong>more than 15 Single Points (≥ 16 pts)</strong>.
                          Live leaders and contenders progressing toward qualification are shown below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Section B: Live Category Top Scorers & Contenders */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                          Live {selectedCategory} Single-Item Scorers
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Only Single items count toward individual points • Group scores count for tie-breaking
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {individualData.contenders.length} Contenders
                      </span>
                    </div>

                    {individualData.contenders.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No Single-item scores recorded for {selectedCategory} yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {individualData.contenders.map((student, idx) => (
                          <div
                            key={student.regNo || idx}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                          >
                            {/* Student Details */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                  idx === 0
                                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                                    : idx === 1
                                    ? 'bg-slate-200 text-slate-800'
                                    : idx === 2
                                    ? 'bg-orange-200 text-orange-950'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {idx + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm sm:text-base text-[#1B254B] truncate">
                                    {student.name}
                                  </h4>
                                  {student.regNo && (
                                    <span className="font-mono text-xs text-slate-400">
                                      #{student.regNo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                  Madrasa: <strong className="text-slate-700">{student.unit}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Qualification Progress & Status */}
                            <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pl-12 sm:pl-0">
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-mono font-black text-base sm:text-lg text-[#1B254B]">
                                    {student.singlePoints}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-1">pts</span>
                                  <span className="text-[10px] text-slate-400 ml-1.5">
                                    ({student.rank1Count || 0} 🥇)
                                  </span>
                                </div>

                                {student.isQualified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Qualified
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {student.statusText || 'Contender'}
                                  </span>
                                )}
                              </div>

                              {/* Progress toward 16 points */}
                              <div className="w-full sm:w-44 flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      student.isQualified
                                        ? 'bg-emerald-500'
                                        : 'bg-[#F26430]'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.round(((student.singlePoints || 0) / 16) * 100))}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {student.singlePoints}/16
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* OFF-SCREEN CHAMPIONSHIP PDF EXPORT TEMPLATE */}
      <div
        id="championship-pdf-template"
        className="fixed -left-[9999px] top-0 w-[800px] bg-white p-8 text-slate-900 font-sans"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
            SAMASTHA KERALA ISLAM MATHA VIDHYABHYASA BOARD
          </p>
          <p className="text-xs font-semibold text-slate-500">
            DHIFA DHARUL HUDA ISLAMIC FEDERATION MALAPPURAM Dt.
          </p>
          <h1 className="text-2xl font-black text-slate-950 mt-1 uppercase tracking-tight">
            SARGOLSAV 2026 - CHAMPIONSHIP STANDINGS
          </h1>
          <p className="text-xs font-bold text-[#F26430] uppercase mt-1">
            {activeView === 'OVERALL_UNIT'
              ? 'Overall Madrasa Standings'
              : activeView === 'CATEGORY_UNIT'
              ? `${selectedCategory} Madrasa Standings`
              : `${selectedCategory} Individual Championship`}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Official Standings as of: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Content Table */}
        {activeView === 'INDIVIDUAL' ? (
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-12">Rank</th>
                <th className="p-2 border-r border-slate-300">Reg No</th>
                <th className="p-2 border-r border-slate-300">Student Name</th>
                <th className="p-2 border-r border-slate-300">Madrasa</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">🥇 1st</th>
                <th className="p-2 text-right w-24">Single Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {individualData.contenders.map((s, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-mono">
                    #{s.regNo || '-'}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-bold">
                    {s.name}
                  </td>
                  <td className="p-2 border-r border-slate-300">
                    {s.unit}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">
                    {s.rank1Count || 0}
                  </td>
                  <td className="p-2 text-right font-mono font-black">
                    {s.singlePoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-14">Rank</th>
                <th className="p-2 border-r border-slate-300">Madrasa</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">🥇 1st</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">🥈 2nd</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">🥉 3rd</th>
                <th className="p-2 border-r border-slate-300 text-center w-28">Grades (A/B/C)</th>
                <th className="p-2 text-right w-24">Total Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(activeView === 'OVERALL_UNIT' ? overallUnitStandings : categoryUnitStandings).map((u, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">
                    {u.position || idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-bold">
                    {u.unit}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-amber-800">
                    {u.rank1Count || 0}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-700">
                    {u.rank2Count || 0}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-orange-800">
                    {u.rank3Count || 0}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono">
                    {u.gradeACount || 0}/{u.gradeBCount || 0}/{u.gradeCCount || 0}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-slate-900">
                    {u.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
          <p>Generated by Sargolsav 2026 Tabulation & Scoring Engine</p>
          <p>DHIFA Examination & Tabulation Committee</p>
        </div>
      </div>
    </div>
  );
}
