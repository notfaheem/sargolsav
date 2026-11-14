import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { calculateScoresheet } from '../lib/tabulationEngine';
import PublishPreviewModal from './PublishPreviewModal';
import { CATEGORIES } from './CategorySelector';
import {
  FileSpreadsheet,
  Save,
  Eye,
  CheckCircle2,
  Clock,
  UserPlus,
  Trash2,
  AlertCircle,
  Loader2,
  Layers,
  Search,
  Filter,
  Users,
  User,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Download,
} from 'lucide-react';
import OfficialResultPdfTemplate from './OfficialResultPdfTemplate';
import { downloadResultPdf } from '../lib/pdfGenerator';

export default function ScoreSheetManager({ onShowToast }) {
  // Category & Item selection
  const [selectedCategory, setSelectedCategory] = useState('KIDS');
  const [items, setItems] = useState([]);
  const [selectedItemCode, setSelectedItemCode] = useState(null);
  const [itemStatusFilter, setItemStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PUBLISHED'

  // Settings: enforce minimum 2 entries rule
  const [enforceMinRule, setEnforceMinRule] = useState(false);

  // Scoresheet data
  const [rows, setRows] = useState([]);
  const [isLoadingScoresheet, setIsLoadingScoresheet] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Preview & Publish Modal
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Late Entry Modal
  const [showLateEntryModal, setShowLateEntryModal] = useState(false);
  const [lateEntryRegNo, setLateEntryRegNo] = useState('');
  const [isAddingLateEntry, setIsAddingLateEntry] = useState(false);
  const [lateEntryError, setLateEntryError] = useState('');

  // Delete participant from item confirmation
  const [removingRow, setRemovingRow] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch items and settings
  const fetchItemsAndSettings = useCallback(async () => {
    try {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase
          .from('items')
          .select('code, name_ml, name_en, category, mode, is_published, published_at')
          .order('code', { ascending: true }),
        supabase
          .from('settings')
          .select('enforce_min_entry_rule')
          .eq('id', 1)
          .single(),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      const allItems = itemsRes.data || [];
      setItems(allItems);

      if (settingsRes.data) {
        setEnforceMinRule(Boolean(settingsRes.data.enforce_min_entry_rule));
      }

      // Default select first item of category if none selected
      if (!selectedItemCode && allItems.length > 0) {
        const first = allItems.find((i) => i.category === 'KIDS') || allItems[0];
        setSelectedItemCode(first.code);
      }
    } catch (err) {
      console.error('Error fetching items for score sheet:', err);
      logger.error('SCORESHEET_INIT', err.message);
    }
  }, [selectedItemCode]);

  useEffect(() => {
    fetchItemsAndSettings();
  }, [fetchItemsAndSettings]);

  // Currently selected item object
  const currentItem = useMemo(() => {
    return items.find((i) => i.code === selectedItemCode) || null;
  }, [items, selectedItemCode]);

  // Items filtered by category and publish status
  const filteredCategoryItems = useMemo(() => {
    return items.filter((i) => {
      if (i.category !== selectedCategory) return false;
      if (itemStatusFilter === 'PUBLISHED') return i.is_published === true;
      if (itemStatusFilter === 'PENDING') return !i.is_published;
      return true;
    });
  }, [items, selectedCategory, itemStatusFilter]);

  // Fetch score sheet rows for current item
  const fetchScoresheet = useCallback(async () => {
    if (!selectedItemCode) return;
    setIsLoadingScoresheet(true);

    try {
      // 1. Fetch participations for this item_code
      const { data: participations, error: ptError } = await supabase
        .from('participations')
        .select('*')
        .eq('item_code', selectedItemCode);

      if (ptError) throw ptError;

      if (!participations || participations.length === 0) {
        setRows([]);
        setIsLoadingScoresheet(false);
        return;
      }

      // 2. Fetch participant profile information
      const regNos = participations.map((p) => p.reg_no);
      const { data: participants, error: pError } = await supabase
        .from('participants')
        .select('reg_no, name, unit, madrasa')
        .in('reg_no', regNos);

      if (pError) throw pError;

      const pMap = new Map();
      (participants || []).forEach((p) => {
        pMap.set(String(p.reg_no), p);
      });

      // 3. Merge data
      const merged = participations.map((pt) => {
        const profile = pMap.get(String(pt.reg_no)) || {};
        return {
          id: pt.id,
          reg_no: pt.reg_no,
          item_code: pt.item_code,
          chest_no: pt.chest_no || '',
          name: profile.name || `Participant #${pt.reg_no}`,
          unit: profile.unit || '—',
          madrasa: profile.madrasa || '',
          judge1: pt.judge1,
          judge2: pt.judge2,
          judge3: pt.judge3,
          total_score: pt.total_score,
          percentage: pt.percentage,
          grade: pt.grade,
          rank: pt.rank,
          points: pt.points ?? 0,
        };
      });

      // Sort by reg_no ascending
      merged.sort((a, b) => {
        const numA = parseInt(a.reg_no, 10) || 0;
        const numB = parseInt(b.reg_no, 10) || 0;
        return numA - numB;
      });

      // Run tabulation engine calculation
      const calculated = calculateScoresheet(merged, enforceMinRule);
      setRows(calculated);

      logger.success(
        'FETCH_SCORESHEET',
        `Loaded score sheet for Item #${selectedItemCode} (${calculated.length} entries)`
      );
    } catch (err) {
      console.error('Error fetching scoresheet:', err);
      logger.error('FETCH_SCORESHEET', err.message);
      if (onShowToast) {
        onShowToast('Failed to load item scoresheet.', 'error');
      }
    } finally {
      setIsLoadingScoresheet(false);
    }
  }, [selectedItemCode, enforceMinRule, onShowToast]);

  useEffect(() => {
    fetchScoresheet();
  }, [fetchScoresheet]);

  // Handle Score Input Changes with real-time recalculation
  const handleScoreChange = (regNo, field, value) => {
    setRows((prevRows) => {
      const updated = prevRows.map((r) => {
        if (r.reg_no === regNo) {
          return {
            ...r,
            [field]: value === '' ? null : value,
          };
        }
        return r;
      });
      // Recalculate live
      return calculateScoresheet(updated, enforceMinRule);
    });
  };

  // Handle Chest No change
  const handleChestNoChange = (regNo, val) => {
    setRows((prev) =>
      prev.map((r) => (r.reg_no === regNo ? { ...r, chest_no: val } : r))
    );
  };

  // Save Draft Scores
  const handleSaveDraft = async () => {
    if (isSavingDraft || !selectedItemCode) return;
    setIsSavingDraft(true);

    try {
      const calculated = calculateScoresheet(rows, enforceMinRule);

      // Bulk update participations rows
      const updates = calculated.map((r) => ({
        id: r.id,
        item_code: selectedItemCode,
        reg_no: r.reg_no,
        chest_no: r.chest_no || null,
        judge1: r.judge1,
        judge2: r.judge2,
        judge3: r.judge3,
        total_score: r.total_score,
        percentage: r.percentage,
        grade: r.grade,
        rank: r.rank,
        points: r.points ?? 0,
      }));

      const { error } = await supabase
        .from('participations')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      logger.success(
        'SAVE_DRAFT_SCORES',
        `Draft scores saved for Item #${selectedItemCode} (${updates.length} rows)`,
        { itemCode: selectedItemCode }
      );

      if (onShowToast) {
        onShowToast(`Draft scores saved successfully for Item #${selectedItemCode}!`, 'success');
      }

      await fetchScoresheet();
    } catch (err) {
      console.error('Error saving draft scores:', err);
      logger.error('SAVE_DRAFT_SCORES', err.message);
      if (onShowToast) {
        onShowToast(`Failed to save draft scores: ${err.message}`, 'error');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Confirm and Publish Live
  const handleConfirmPublish = async (verifiedRows) => {
    if (isPublishing || !selectedItemCode) return;
    setIsPublishing(true);

    try {
      // 1. Save all participation scores & overrides
      const updates = verifiedRows.map((r) => ({
        id: r.id,
        item_code: selectedItemCode,
        reg_no: r.reg_no,
        chest_no: r.chest_no || null,
        judge1: r.judge1,
        judge2: r.judge2,
        judge3: r.judge3,
        total_score: r.total_score,
        percentage: r.percentage,
        grade: r.grade,
        rank: r.rank,
        points: r.points ?? 0,
      }));

      const { error: ptError } = await supabase
        .from('participations')
        .upsert(updates, { onConflict: 'id' });

      if (ptError) throw ptError;

      // 2. Mark item as published
      const now = new Date().toISOString();
      const { error: itemError } = await supabase
        .from('items')
        .update({ is_published: true, published_at: now })
        .eq('code', selectedItemCode);

      if (itemError) throw itemError;

      logger.success(
        'PUBLISH_RESULT',
        `Item #${selectedItemCode} published to live portal!`,
        { itemCode: selectedItemCode, publishedAt: now }
      );

      if (onShowToast) {
        onShowToast(
          `🎉 Item #${selectedItemCode} results successfully published to live website!`,
          'success'
        );
      }

      setShowPublishModal(false);
      // Refresh items list and current scoresheet
      await fetchItemsAndSettings();
      await fetchScoresheet();
    } catch (err) {
      console.error('Error publishing item result:', err);
      logger.error('PUBLISH_RESULT', err.message);
      if (onShowToast) {
        onShowToast(`Failed to publish result: ${err.message}`, 'error');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish Item
  const handleUnpublish = async () => {
    if (isUnpublishing || !selectedItemCode) return;
    setIsUnpublishing(true);

    try {
      const { error } = await supabase
        .from('items')
        .update({ is_published: false, published_at: null })
        .eq('code', selectedItemCode);

      if (error) throw error;

      logger.warn(
        'UNPUBLISH_RESULT',
        `Item #${selectedItemCode} set back to Unpublished / Draft`,
        { itemCode: selectedItemCode }
      );

      if (onShowToast) {
        onShowToast(`Item #${selectedItemCode} unpublished successfully.`, 'success');
      }

      await fetchItemsAndSettings();
    } catch (err) {
      console.error('Error unpublishing item:', err);
      logger.error('UNPUBLISH_RESULT', err.message);
      if (onShowToast) {
        onShowToast(`Failed to unpublish: ${err.message}`, 'error');
      }
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Add Late Entry
  const handleAddLateEntry = async (e) => {
    e.preventDefault();
    setLateEntryError('');
    if (!lateEntryRegNo.trim() || !selectedItemCode || isAddingLateEntry) return;

    setIsAddingLateEntry(true);
    try {
      const regNo = parseInt(lateEntryRegNo.trim(), 10);
      if (isNaN(regNo)) {
        setLateEntryError('Please enter a valid numeric Registration No.');
        return;
      }

      // 1. Verify participant exists
      const { data: pData, error: pError } = await supabase
        .from('participants')
        .select('reg_no, name, category, unit')
        .eq('reg_no', regNo)
        .single();

      if (pError || !pData) {
        setLateEntryError(`Participant #${regNo} not found in database. Please register them first.`);
        return;
      }

      // 2. Add participation
      const { error: ptError } = await supabase
        .from('participations')
        .upsert(
          { item_code: selectedItemCode, reg_no: regNo },
          { onConflict: 'item_code,reg_no', ignoreDuplicates: true }
        );

      if (ptError) throw ptError;

      logger.success(
        'ADD_LATE_ENTRY',
        `Enrolled late entry #${regNo} (${pData.name}) into Item #${selectedItemCode}`
      );

      if (onShowToast) {
        onShowToast(`Participant #${regNo} added to Item #${selectedItemCode}!`, 'success');
      }

      setLateEntryRegNo('');
      setShowLateEntryModal(false);
      await fetchScoresheet();
    } catch (err) {
      console.error('Error adding late entry:', err);
      setLateEntryError(err.message || 'Failed to add late entry');
    } finally {
      setIsAddingLateEntry(false);
    }
  };

  // Remove participant from item
  const handleRemoveParticipant = async () => {
    if (!removingRow || isRemoving) return;
    setIsRemoving(true);

    try {
      const { error } = await supabase
        .from('participations')
        .delete()
        .eq('item_code', selectedItemCode)
        .eq('reg_no', removingRow.reg_no);

      if (error) throw error;

      logger.warn(
        'REMOVE_FROM_ITEM',
        `Removed participant #${removingRow.reg_no} from Item #${selectedItemCode}`
      );

      if (onShowToast) {
        onShowToast(`Removed participant #${removingRow.reg_no} from this item.`, 'success');
      }

      setRemovingRow(null);
      await fetchScoresheet();
    } catch (err) {
      console.error('Error removing participant from item:', err);
      logger.error('REMOVE_FROM_ITEM', err.message);
      if (onShowToast) {
        onShowToast(`Failed to remove: ${err.message}`, 'error');
      }
    } finally {
      setIsRemoving(false);
    }
  };

  // Download Official Result PDF Handler
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !currentItem) return;
    setIsDownloadingPdf(true);
    try {
      await downloadResultPdf(`admin-result-pdf-${currentItem.code}`, currentItem.code);
      if (onShowToast) onShowToast('Result PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      if (onShowToast) onShowToast(`Failed to generate PDF: ${err.message}`, 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Category & Item Selector Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Select Category
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  const firstOfCat = items.find((i) => i.category === cat.id);
                  if (firstOfCat) setSelectedItemCode(firstOfCat.code);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? `${cat.activeBg} text-white shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item Selector & Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Item Dropdown */}
          <div className="flex-1">
            <label htmlFor="item-select" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Festival Item ({filteredCategoryItems.length} items)
            </label>
            <select
              id="item-select"
              value={selectedItemCode || ''}
              onChange={(e) => setSelectedItemCode(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
            >
              {filteredCategoryItems.map((item) => (
                <option key={item.code} value={item.code}>
                  #{item.code} - {item.name_ml} ({item.name_en}) [{item.mode}] {item.is_published ? '✅ PUBLISHED' : '⏳ PENDING'}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter: All / Pending / Published */}
          <div className="sm:self-end">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status Filter
            </label>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setItemStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  itemStatusFilter === 'ALL' ? 'bg-white text-[#1B254B] shadow-xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setItemStatusFilter('PENDING')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  itemStatusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setItemStatusFilter('PUBLISHED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  itemStatusFilter === 'PUBLISHED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Published
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Official Consolidated Score Sheet Header Banner */}
      {currentItem && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#1B254B] text-white">
                  #{currentItem.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#F26430]">
                  {currentItem.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                  {currentItem.mode}
                </span>
                {currentItem.is_published ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Published
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Draft / Pending
                  </span>
                )}
              </div>

              <h2 className="font-ml text-xl sm:text-2xl font-bold text-[#1B254B] leading-tight">
                {currentItem.name_ml}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                {currentItem.name_en}
              </p>
            </div>

            {/* Total Entries & Single Entry Rule toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Entries</p>
                <p className="text-lg font-black text-[#1B254B] font-mono">{rows.length}</p>
              </div>

              {/* Min Entry Rule Indicator / Toggle */}
              <label className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={enforceMinRule}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEnforceMinRule(checked);
                    setRows((prev) => calculateScoresheet(prev, checked));
                  }}
                  className="rounded border-slate-300 text-[#F26430] focus:ring-[#F26430]"
                />
                <span className="font-semibold text-slate-700">
                  Enforce Min 2 Entries Rule
                </span>
              </label>

              {/* Late Entry Button */}
              <button
                type="button"
                onClick={() => {
                  setLateEntryError('');
                  setLateEntryRegNo('');
                  setShowLateEntryModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1B254B] hover:bg-navy-800 text-white transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#F26430]" />
                <span>+ Add Late Entry</span>
              </button>
            </div>
          </div>

          {/* 3. Consolidated Score Sheet Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-[#1B254B] text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Sl.</th>
                  <th className="py-3 px-3 w-24">Chest No</th>
                  <th className="py-3 px-3 w-20">Reg. No</th>
                  <th className="py-3 px-4">Participant & Madrasa</th>
                  <th className="py-3 px-3 w-24 text-center">Judge 1 (100)</th>
                  <th className="py-3 px-3 w-24 text-center">Judge 2 (100)</th>
                  <th className="py-3 px-3 w-24 text-center">Judge 3 (100)</th>
                  <th className="py-3 px-3 w-28 text-center">Total (300)</th>
                  <th className="py-3 px-2 w-16 text-center">Grade</th>
                  <th className="py-3 px-2 w-16 text-center">Rank</th>
                  <th className="py-3 px-2 w-16 text-center">Points</th>
                  <th className="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingScoresheet ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#F26430] mb-2" />
                      <span>Loading consolidated score sheet...</span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No participants enrolled in this item</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use the Importer or click &apos;+ Add Late Entry&apos; above to register participants.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isRanked = row.rank !== null && row.rank !== undefined;
                    return (
                      <tr
                        key={row.reg_no}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          row.rank === 1
                            ? 'bg-amber-50/40'
                            : row.rank === 2
                            ? 'bg-slate-50/60'
                            : row.rank === 3
                            ? 'bg-orange-50/30'
                            : ''
                        }`}
                      >
                        {/* Sl No */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Chest No */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.chest_no || ''}
                            onChange={(e) => handleChestNoChange(row.reg_no, e.target.value)}
                            placeholder="Chest #"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1B254B]"
                          />
                        </td>

                        {/* Reg No */}
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1B254B] whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            #{row.reg_no}
                          </span>
                        </td>

                        {/* Participant & Unit */}
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-[#1B254B] leading-tight truncate max-w-[200px]">
                            {row.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {row.unit}
                          </p>
                        </td>

                        {/* Judge 1 */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.judge1 ?? ''}
                            onChange={(e) => handleScoreChange(row.reg_no, 'judge1', e.target.value)}
                            placeholder="—"
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                          />
                        </td>

                        {/* Judge 2 */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.judge2 ?? ''}
                            onChange={(e) => handleScoreChange(row.reg_no, 'judge2', e.target.value)}
                            placeholder="—"
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                          />
                        </td>

                        {/* Judge 3 */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={row.judge3 ?? ''}
                            onChange={(e) => handleScoreChange(row.reg_no, 'judge3', e.target.value)}
                            placeholder="—"
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                          />
                        </td>

                        {/* Total Score & % */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {row.isAbsent ? (
                            <span className="text-[11px] text-slate-400 italic font-medium">Absent</span>
                          ) : (
                            <div>
                              <span className="font-mono font-black text-sm text-[#1B254B]">
                                {row.total_score}
                              </span>
                              <p className="text-[10px] font-mono text-slate-500">
                                {row.percentage}%
                              </p>
                            </div>
                          )}
                        </td>

                        {/* Grade */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {row.grade ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-xs font-black ${
                                row.grade === 'A'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : row.grade === 'B'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {row.grade}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Rank */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {isRanked ? (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                row.rank === 1
                                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                                  : row.rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : 'bg-[#F26430] text-white'
                              }`}
                            >
                              {row.rank}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                              (row.points || 0) > 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.points || 0}
                          </span>
                        </td>

                        {/* Remove participant from item */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setRemovingRow(row)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                            title="Remove from item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Action Buttons Footer */}
          {rows.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {currentItem.is_published && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Download Official Result PDF"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>📥 Download Result PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={isUnpublishing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUnpublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Unpublish Live Result</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Save Draft */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-[#1B254B] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#F26430]" />
                      <span>💾 Save Draft Scores</span>
                    </>
                  )}
                </button>

                {/* Preview & Publish */}
                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>👁️ Preview & Publish Result</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Publish Preview & Manual Override Modal */}
      {showPublishModal && currentItem && (
        <PublishPreviewModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          item={currentItem}
          rows={rows}
          onConfirmPublish={handleConfirmPublish}
          isPublishing={isPublishing}
        />
      )}

      {/* 6. Late Entry Modal */}
      {showLateEntryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 text-[#F26430] flex items-center justify-center mb-2">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1B254B]">Add Late Entry</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enroll an existing participant into Item #{selectedItemCode}
              </p>
            </div>

            <form onSubmit={handleAddLateEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
                  Participant Reg No
                </label>
                <input
                  type="number"
                  value={lateEntryRegNo}
                  onChange={(e) => setLateEntryRegNo(e.target.value)}
                  placeholder="e.g. 10252"
                  autoFocus
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
                />
              </div>

              {lateEntryError && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {lateEntryError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLateEntryModal(false)}
                  disabled={isAddingLateEntry}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingLateEntry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1B254B] text-white hover:bg-navy-800 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isAddingLateEntry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Add to Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Remove Participant From Item Confirmation */}
      {removingRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B254B]">Remove from Item?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Remove participant{' '}
                <strong className="text-slate-800">
                  #{removingRow.reg_no} - {removingRow.name}
                </strong>{' '}
                from Item #{selectedItemCode}? This will remove their scores for this item.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemovingRow(null)}
                disabled={isRemoving}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveParticipant}
                disabled={isRemoving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen high-res template for PDF generation */}
      {currentItem && (
        <OfficialResultPdfTemplate
          containerId={`admin-result-pdf-${currentItem.code}`}
          item={currentItem}
          results={rows.filter((r) => r.rank || r.grade)}
        />
      )}
    </div>
  );
}
