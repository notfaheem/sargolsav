import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { parseParticipantData, deriveDefaultUnitName } from '../lib/parseParticipants';
import ParticipantModal from './ParticipantModal';
import MadrasaUnitMapper from './MadrasaUnitMapper';
import {
  Users,
  Building2,
  BookmarkCheck,
  Upload,
  FileSpreadsheet,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Edit,
  Trash2,
  X,
  ChevronDown,
  RefreshCw,
  FileText,
} from 'lucide-react';

export default function ParticipantManager({ onShowToast }) {
  // Directory state
  const [participants, setParticipants] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterUnit, setFilterUnit] = useState('ALL');

  // Importer state
  const [showImporter, setShowImporter] = useState(false);
  const [importMode, setImportMode] = useState('upload'); // 'upload' | 'paste'
  const [rawText, setRawText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // Single Participant Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Delete confirmation modal state
  const [deletingParticipant, setDeletingParticipant] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear all data confirmation modal state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Madrasa to Unit Mapper modal state
  const [showMadrasaMapperModal, setShowMadrasaMapperModal] = useState(false);

  // Fetch initial data: participants, participations, and items
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, ptRes, itemsRes] = await Promise.all([
        supabase.from('participants').select('*').order('reg_no', { ascending: true }),
        supabase.from('participations').select('id, item_code, reg_no'),
        supabase.from('items').select('code, name_ml, name_en, category, mode'),
      ]);

      if (pRes.error) throw pRes.error;
      if (ptRes.error) throw ptRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setParticipants(pRes.data || []);
      setParticipations(ptRes.data || []);
      setItems(itemsRes.data || []);

      logger.success(
        'FETCH_PARTICIPANTS',
        `Loaded ${pRes.data?.length || 0} participants and ${ptRes.data?.length || 0} enrollments`
      );
    } catch (err) {
      console.error('Error fetching participant directory:', err);
      logger.error('FETCH_PARTICIPANTS', `Failed to load participants: ${err.message}`);
      if (onShowToast) {
        onShowToast('Failed to load participants. Check connection.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map participant reg_no to enrolled items
  const enrollmentsMap = useMemo(() => {
    const map = new Map();
    participations.forEach((pt) => {
      const list = map.get(pt.reg_no) || [];
      list.push(pt.item_code);
      map.set(pt.reg_no, list);
    });
    return map;
  }, [participations]);

  // Distinct units list for filter dropdown
  const distinctUnits = useMemo(() => {
    const unitsSet = new Set();
    participants.forEach((p) => {
      if (p.unit) unitsSet.add(p.unit.trim().toUpperCase());
    });
    return Array.from(unitsSet).sort();
  }, [participants]);

  // Valid item codes lookup
  const validItemCodesSet = useMemo(() => {
    return new Set(items.map((i) => i.code));
  }, [items]);

  // Handle parsing when rawText or file changes
  const handleParseText = (text) => {
    setRawText(text);
    if (!text || !text.trim()) {
      setParsedResult(null);
      return;
    }
    const result = parseParticipantData(text);

    // Identify unknown item codes
    const unknownCodes = new Set();
    result.enrollments.forEach((e) => {
      if (!validItemCodesSet.has(e.item_code)) {
        unknownCodes.add(e.item_code);
      }
    });

    setParsedResult({
      ...result,
      unknownCodes: Array.from(unknownCodes),
    });
  };

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      handleParseText(content);
    };
    reader.readAsText(file);
  };

  // Confirm and Execute Bulk Import
  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.participants.length === 0 || isImporting) return;

    setIsImporting(true);
    setImportProgress('Preparing database batch...');

    try {
      // Step 0: Fetch existing mappings from madrasa_unit_map
      setImportProgress('Fetching Madrasa to Unit mappings...');
      const { data: existingMapRows, error: mapErr } = await supabase
        .from('madrasa_unit_map')
        .select('madrasa, unit');

      if (mapErr) {
        console.warn('Notice loading madrasa_unit_map:', mapErr);
      }

      const mappingMap = new Map();
      (existingMapRows || []).forEach((row) => {
        if (row.madrasa) {
          mappingMap.set(row.madrasa.trim(), row.unit?.trim().toUpperCase() || 'UNASSIGNED');
        }
      });

      // Normalize madrasa names, ignore raw CSV unit, resolve or auto-generate unit
      const newMappingsToUpsert = new Map();
      const participantRows = parsedResult.participants.map((p) => {
        const cleanMadrasa = (p.madrasa || '').trim();
        let assignedUnit = 'UNASSIGNED';

        if (cleanMadrasa) {
          if (mappingMap.has(cleanMadrasa)) {
            assignedUnit = mappingMap.get(cleanMadrasa);
          } else {
            // Auto-generate clean default Unit short-name from madrasa
            assignedUnit = deriveDefaultUnitName(cleanMadrasa);
            mappingMap.set(cleanMadrasa, assignedUnit);
            newMappingsToUpsert.set(cleanMadrasa, assignedUnit);
          }
        }

        return {
          reg_no: p.reg_no,
          name: p.name,
          category: p.category,
          district: p.district || 'MALAPPURAM',
          zone: p.zone || 'NILAMBUR',
          unit: assignedUnit,
          madrasa: cleanMadrasa,
        };
      });

      // Upsert any newly auto-generated madrasa_unit_map pairs
      if (newMappingsToUpsert.size > 0) {
        setImportProgress(`Saving ${newMappingsToUpsert.size} newly discovered Madrasa mappings...`);
        const mapRows = Array.from(newMappingsToUpsert.entries()).map(([madrasa, unit]) => ({
          madrasa,
          unit,
        }));
        const { error: upsertMapErr } = await supabase
          .from('madrasa_unit_map')
          .upsert(mapRows, { onConflict: 'madrasa' });

        if (upsertMapErr) {
          console.warn('Notice saving new madrasa mappings:', upsertMapErr);
        }
      }

      // Step 1: Bulk Upsert Participants
      setImportProgress(`Upserting ${participantRows.length} participants with unified units...`);
      const { error: pError } = await supabase
        .from('participants')
        .upsert(participantRows, { onConflict: 'reg_no' });

      if (pError) throw pError;

      // Step 2: Bulk Upsert Enrollments
      // Crucial: ignoreDuplicates=true preserves existing judge scores!
      setImportProgress(`Enrolling ${parsedResult.enrollments.length} item participations...`);
      const enrollmentRows = parsedResult.enrollments.map((e) => ({
        item_code: e.item_code,
        reg_no: e.reg_no,
      }));

      if (enrollmentRows.length > 0) {
        const { error: ptError } = await supabase
          .from('participations')
          .upsert(enrollmentRows, { onConflict: 'item_code,reg_no', ignoreDuplicates: true });

        if (ptError) throw ptError;
      }

      const logMsg = `Successfully imported ${participantRows.length} participants and ${enrollmentRows.length} item enrollments`;
      logger.success('BULK_IMPORT', logMsg, {
        participantsCount: participantRows.length,
        enrollmentsCount: enrollmentRows.length,
      });

      if (onShowToast) {
        onShowToast(logMsg, 'success');
      }

      // Reset import form
      setRawText('');
      setParsedResult(null);
      setShowImporter(false);

      // Refresh list
      await fetchData();
    } catch (err) {
      console.error('Error during bulk import:', err);
      const errMsg = `Import failed: ${err.message}`;
      logger.error('BULK_IMPORT', errMsg);
      if (onShowToast) {
        onShowToast(errMsg, 'error');
      }
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  // Add / Edit Single Participant Save
  const handleSaveSingleParticipant = async (participantData) => {
    setIsSubmittingModal(true);
    try {
      const { reg_no, name, category, district, zone, unit, madrasa, items: selectedCodes } = participantData;

      // Upsert participant
      const { error: pError } = await supabase
        .from('participants')
        .upsert(
          {
            reg_no,
            name,
            category,
            district,
            zone,
            unit,
            madrasa,
          },
          { onConflict: 'reg_no' }
        );

      if (pError) throw pError;

      // Synchronize participations:
      // Insert selected items with ignoreDuplicates=true
      if (selectedCodes.length > 0) {
        const enrollRows = selectedCodes.map((code) => ({
          item_code: code,
          reg_no,
        }));

        const { error: ptError } = await supabase
          .from('participations')
          .upsert(enrollRows, { onConflict: 'item_code,reg_no', ignoreDuplicates: true });

        if (ptError) throw ptError;
      }

      // Remove unselected participations if editing
      if (editingParticipant) {
        const currentEnrolled = enrollmentsMap.get(reg_no) || [];
        const toRemove = currentEnrolled.filter((c) => !selectedCodes.includes(c));
        if (toRemove.length > 0) {
          await supabase
            .from('participations')
            .delete()
            .eq('reg_no', reg_no)
            .in('item_code', toRemove);
        }
      }

      const actionText = editingParticipant ? 'Updated' : 'Created';
      const msg = `${actionText} participant #${reg_no} (${name}) with ${selectedCodes.length} item enrollments`;
      logger.success('PARTICIPANT_SAVE', msg);

      if (onShowToast) {
        onShowToast(msg, 'success');
      }

      setIsModalOpen(false);
      setEditingParticipant(null);
      await fetchData();
    } catch (err) {
      console.error('Error saving single participant:', err);
      const errMsg = `Failed to save participant: ${err.message}`;
      logger.error('PARTICIPANT_SAVE', errMsg);
      if (onShowToast) {
        onShowToast(errMsg, 'error');
      }
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Delete Participant
  const handleConfirmDelete = async () => {
    if (!deletingParticipant || isDeleting) return;
    setIsDeleting(true);

    try {
      const { reg_no, name } = deletingParticipant;

      // 1. Delete participations
      await supabase.from('participations').delete().eq('reg_no', reg_no);

      // 2. Delete participant
      const { error } = await supabase.from('participants').delete().eq('reg_no', reg_no);
      if (error) throw error;

      const msg = `Deleted participant #${reg_no} (${name}) and all associated enrollments`;
      logger.warn('PARTICIPANT_DELETE', msg);

      if (onShowToast) {
        onShowToast(msg, 'success');
      }

      setDeletingParticipant(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting participant:', err);
      logger.error('PARTICIPANT_DELETE', `Delete failed: ${err.message}`);
      if (onShowToast) {
        onShowToast(`Failed to delete participant: ${err.message}`, 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear All Participants, Enrollments, and Reset Item Published States
  const handleClearAllData = async () => {
    if (clearConfirmText.trim() !== 'DELETE' || isClearingAll) return;
    setIsClearingAll(true);

    try {
      // 1. Delete all rows from participations
      const { error: ptError } = await supabase
        .from('participations')
        .delete()
        .neq('id', 0);
      if (ptError) throw ptError;

      // 2. Delete all rows from participants
      const { error: pError } = await supabase
        .from('participants')
        .delete()
        .neq('reg_no', '');
      if (pError) throw pError;

      // 3. Reset all items to unpublished
      const { error: itemError } = await supabase
        .from('items')
        .update({ is_published: false, published_at: null })
        .neq('code', 0);
      if (itemError) throw itemError;

      // 4. Log to System Diagnostics Console
      logger.warn(
        'CLEAR_ALL_DATA',
        'Permanently cleared all participants, item enrollments, scores, and reset all 71 items to unpublished'
      );

      if (onShowToast) {
        onShowToast(
          'All participant data, scores, and item publication states have been completely reset.',
          'success'
        );
      }

      setShowClearAllModal(false);
      setClearConfirmText('');
      await fetchData();
    } catch (err) {
      console.error('Error clearing all data:', err);
      logger.error('CLEAR_ALL_DATA', `Reset failed: ${err.message}`);
      if (onShowToast) {
        onShowToast(`Clear all data failed: ${err.message}`, 'error');
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  // Filtered participants list
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Category filter
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;

      // Unit filter
      if (filterUnit !== 'ALL' && p.unit?.toUpperCase() !== filterUnit) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const regStr = String(p.reg_no);
      const name = (p.name || '').toLowerCase();
      const unit = (p.unit || '').toLowerCase();
      const madrasa = (p.madrasa || '').toLowerCase();

      return regStr.includes(q) || name.includes(q) || unit.includes(q) || madrasa.includes(q);
    });
  }, [participants, filterCategory, filterUnit, searchQuery]);

  // Category badge styling helper
  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'KIDS':
        return 'bg-orange-50 text-[#F26430] border-orange-200';
      case 'CHILDREN':
        return 'bg-emerald-50 text-[#16A34A] border-emerald-200';
      case 'SUB JUNIOR':
        return 'bg-blue-50 text-[#2563EB] border-blue-200';
      case 'JUNIOR':
        return 'bg-purple-50 text-[#7C3AED] border-purple-200';
      case 'TEENS':
        return 'bg-teal-50 text-[#0D9488] border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Counter Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Participants */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Participants
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1B254B] mt-1 font-mono">
              {participants.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered festival contenders</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F26430] border border-orange-200 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Units */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Madrasas
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1B254B] mt-1 font-mono">
              {distinctUnits.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Sub-District madrasas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Enrollments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Enrollments
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1B254B] mt-1 font-mono">
              {participations.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Individual & group slots</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center">
            <BookmarkCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Top Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImporter(!showImporter)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
              showImporter
                ? 'bg-[#1B254B] text-white'
                : 'bg-slate-100 text-[#1B254B] hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-[#F26430]" />
            <span>{showImporter ? 'Hide Bulk Importer' : 'Bulk Import (CSV / Paste)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingParticipant(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#F26430] hover:bg-[#D94D1B] text-white transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Single Participant</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setClearConfirmText('');
              setShowClearAllModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all shadow-xs cursor-pointer"
            title="Clear all test data"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Participants</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMadrasaMapperModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-all shadow-xs cursor-pointer"
            title="Open Madrasa Mapping Manager"
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>🏫 Madrasa Mapper</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#1B254B] hover:bg-slate-100 transition-colors"
          title="Refresh Directory"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3. Bulk Importer Panel (Mode A) */}
      {showImporter && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1B254B] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#F26430]" />
                <span>Official MSM CSV & Table Paste Importer</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload `.csv` or copy-paste rows from the official MSM web portal. Existing judge scores will NEVER be overwritten.
              </p>
            </div>

            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setImportMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  importMode === 'upload' ? 'bg-white text-[#1B254B] shadow-xs' : 'text-slate-600'
                }`}
              >
                CSV File Upload
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  importMode === 'paste' ? 'bg-white text-[#1B254B] shadow-xs' : 'text-slate-600'
                }`}
              >
                Copy-Paste Raw Text
              </button>
            </div>
          </div>

          {/* Mode A1: CSV File Upload Dropzone */}
          {importMode === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-[#F26430] rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 text-[#F26430] flex items-center justify-center mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#1B254B]">
                  Click to select official MSM export CSV file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Expected format: Unique ID, Category, Name, Unit, Madrasa, Single, Group
                </p>
              </label>
            </div>
          )}

          {/* Mode A2: Copy-Paste Raw Text Box */}
          {importMode === 'paste' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider">
                Paste Tab-Separated Rows or CSV Text
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => handleParseText(e.target.value)}
                placeholder="Paste rows here (e.g. 1   10252   KIDS   DIYA FATHIMA   MALAPPURAM   NILAMBUR   AKAMBADAM   ANVARUL HUDA   101, 102,   105,   Edit / Delete)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] transition-all"
              />
            </div>
          )}

          {/* Preview Parsed Data */}
          {parsedResult && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#1B254B]">
                      Parsed {parsedResult.participants.length} Participants &{' '}
                      {parsedResult.enrollments.length} Item Enrollments
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ready to bulk upsert into Supabase with conflict resolution.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || parsedResult.participants.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#16A34A] hover:bg-emerald-700 text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{importProgress || 'Importing...'}</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Confirm & Import to Database</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warnings if unknown item codes or parse errors */}
              {parsedResult.unknownCodes?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice:</span> Some parsed item codes are not in the items table: [
                    {parsedResult.unknownCodes.join(', ')}]. Please verify festival item codes.
                  </div>
                </div>
              )}

              {parsedResult.errors?.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                  <p className="font-bold">Row warnings ({parsedResult.errors.length}):</p>
                  <ul className="list-disc list-inside text-[11px] max-h-20 overflow-y-auto">
                    {parsedResult.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table (First 5 rows) */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Reg No</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Madrasa</th>
                      <th className="py-2.5 px-3">Items Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedResult.participants.slice(0, 5).map((p) => (
                      <tr key={p.reg_no} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#1B254B]">#{p.reg_no}</td>
                        <td className="py-2 px-3 font-semibold text-[#1B254B]">{p.name}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(p.category)}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{p.unit}</td>
                        <td className="py-2 px-3 text-slate-500">{p.madrasa}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {p.items?.map((code) => (
                              <span key={code} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                #{code}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Participant Directory Filters & Search */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Reg No, Name, or Madrasa..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-[#1B254B] placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Filters: Category & Unit */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Category Dropdown */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
            >
              <option value="ALL">All Categories</option>
              <option value="KIDS">KIDS</option>
              <option value="CHILDREN">CHILDREN</option>
              <option value="SUB JUNIOR">SUB JUNIOR</option>
              <option value="JUNIOR">JUNIOR</option>
              <option value="TEENS">TEENS</option>
            </select>

            {/* Unit Dropdown */}
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] max-w-[150px] truncate"
            >
              <option value="ALL">All Madrasas</option>
              {distinctUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Directory Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Participant Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">MADRASA (SHORT)</th>
                <th className="py-3 px-4">MADRASA FULL NAME</th>
                <th className="py-3 px-4">Enrolled Items</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#F26430] mb-2" />
                    <span>Loading participant directory...</span>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No participants found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {participants.length === 0
                        ? 'Use the Bulk Importer above or "+ Add Single Participant" to register contenders.'
                        : 'Try adjusting your search or category/unit filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const enrolledCodes = enrollmentsMap.get(p.reg_no) || [];

                  return (
                    <tr key={p.reg_no} className="hover:bg-slate-50 transition-colors">
                      {/* Reg No */}
                      <td className="py-3 px-4 font-mono font-bold text-[#1B254B] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          #{p.reg_no}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-[#1B254B] whitespace-nowrap">
                        {p.name}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(
                            p.category
                          )}`}
                        >
                          {p.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {p.unit || '—'}
                      </td>

                      {/* Madrasa */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {p.madrasa || '—'}
                      </td>

                      {/* Enrolled Items */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {enrolledCodes.length === 0 ? (
                            <span className="text-slate-400 text-[11px] italic">No items</span>
                          ) : (
                            enrolledCodes.map((code) => {
                              const itm = items.find((i) => i.code === code);
                              return (
                                <span
                                  key={code}
                                  title={itm ? `${itm.name_ml} (${itm.name_en})` : `Item #${code}`}
                                  className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-[#1B254B] border border-slate-200/80 hover:bg-orange-50 hover:border-orange-200 hover:text-[#F26430] transition-colors"
                                >
                                  #{code}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingParticipant({
                                ...p,
                                enrolled_items: enrolledCodes,
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1B254B] hover:bg-slate-100 transition-colors"
                            title="Edit participant"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingParticipant(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Directory Count Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2">
          <span>
            Showing {filteredParticipants.length} of {participants.length} participants
          </span>
          {filterCategory !== 'ALL' || filterUnit !== 'ALL' || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setFilterCategory('ALL');
                setFilterUnit('ALL');
                setSearchQuery('');
              }}
              className="text-[#F26430] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* 6. Single Participant Modal (Mode B) */}
      <ParticipantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingParticipant(null);
        }}
        participant={editingParticipant}
        availableItems={items}
        onSave={handleSaveSingleParticipant}
        isSubmitting={isSubmittingModal}
      />

      {/* 7. Delete Confirmation Dialog */}
      {deletingParticipant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B254B]">Delete Participant?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete participant{' '}
                <strong className="text-slate-800">
                  #{deletingParticipant.reg_no} - {deletingParticipant.name}
                </strong>
                ? This will also remove their enrolled item participations.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingParticipant(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Participant</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Clear All Data Confirmation Dialog */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">
                Delete All Participants & Clear Test Data?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                This will permanently delete all participants, all item enrollments/scores, and reset all 71 items to &apos;Unpublished&apos;.
              </p>
            </div>

            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 text-left space-y-2">
              <label htmlFor="delete-confirm-input" className="block text-xs font-bold text-red-900">
                Type <span className="font-mono bg-red-200 px-1 py-0.5 rounded text-red-950">DELETE</span> below to confirm:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
                className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-red-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearAllModal(false);
                  setClearConfirmText('');
                }}
                disabled={isClearingAll}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={clearConfirmText.trim() !== 'DELETE' || isClearingAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isClearingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Clear All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Madrasa to Unit Mapper Modal Shortcut */}
      {showMadrasaMapperModal && (
        <MadrasaUnitMapper
          isModal={true}
          onClose={() => setShowMadrasaMapperModal(false)}
          onShowToast={onShowToast}
          onSyncSuccess={fetchData}
        />
      )}
    </div>
  );
}
