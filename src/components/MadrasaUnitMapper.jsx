import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { deriveDefaultUnitName } from '../lib/parseParticipants';
import {
  Building2,
  RefreshCw,
  Save,
  Search,
  AlertTriangle,
  CheckCircle2,
  Users,
  Layers,
  Sparkles,
  Loader2,
  Filter,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export default function MadrasaUnitMapper({ onShowToast, onSyncSuccess, isModal = false, onClose }) {
  const [mappings, setMappings] = useState([]); // Array of { madrasa, unit, count, isModified }
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'SHARED' | 'UNASSIGNED'

  // Fetch madrasa mappings and participant counts
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch existing mappings from madrasa_unit_map
      const { data: mapRows, error: mapErr } = await supabase
        .from('madrasa_unit_map')
        .select('madrasa, unit')
        .order('madrasa', { ascending: true });

      if (mapErr) throw mapErr;

      // 2. Fetch distinct madrasa names and counts from participants
      const { data: participantRows, error: pErr } = await supabase
        .from('participants')
        .select('madrasa, unit');

      if (pErr) throw pErr;

      // Count participants per madrasa
      const madrasaCountMap = new Map();
      const currentParticipantUnits = new Map();

      (participantRows || []).forEach((p) => {
        const m = (p.madrasa || '').trim();
        if (m) {
          madrasaCountMap.set(m, (madrasaCountMap.get(m) || 0) + 1);
          if (p.unit && !currentParticipantUnits.has(m)) {
            currentParticipantUnits.set(m, p.unit.trim().toUpperCase());
          }
        }
      });

      // Build unified mappings list
      const existingMapDict = new Map();
      (mapRows || []).forEach((row) => {
        if (row.madrasa) {
          existingMapDict.set(row.madrasa.trim(), row.unit?.trim().toUpperCase() || 'UNASSIGNED');
        }
      });

      // Merge: all known madrasas from table + any from participants not yet in map
      const allMadrasaNames = new Set([
        ...Array.from(existingMapDict.keys()),
        ...Array.from(madrasaCountMap.keys()),
      ]);

      const mergedList = Array.from(allMadrasaNames)
        .sort((a, b) => a.localeCompare(b))
        .map((madrasa) => {
          let unit = existingMapDict.get(madrasa);
          if (!unit) {
            // Fallback to participant's current unit or auto-derive
            unit = currentParticipantUnits.get(madrasa) || deriveDefaultUnitName(madrasa);
          }
          return {
            madrasa,
            unit: unit || 'UNASSIGNED',
            count: madrasaCountMap.get(madrasa) || 0,
            originalUnit: unit || 'UNASSIGNED',
            isModified: false,
          };
        });

      setMappings(mergedList);
    } catch (err) {
      console.error('Error loading madrasa unit mappings:', err);
      logger.error('MADRASA_MAP_LOAD', err.message);
      if (onShowToast) onShowToast(`Error loading mappings: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Scan Madrasas from Participants
  const handleScanParticipants = async () => {
    setIsScanning(true);
    try {
      const { data: pRows, error: pErr } = await supabase
        .from('participants')
        .select('madrasa, unit');

      if (pErr) throw pErr;

      const pMadrasaCounts = new Map();
      (pRows || []).forEach((p) => {
        const m = (p.madrasa || '').trim();
        if (m) {
          pMadrasaCounts.set(m, (pMadrasaCounts.get(m) || 0) + 1);
        }
      });

      let newlyDiscoveredCount = 0;
      setMappings((prev) => {
        const existingNames = new Set(prev.map((m) => m.madrasa));
        const updated = [...prev];

        pMadrasaCounts.forEach((count, madrasa) => {
          if (!existingNames.has(madrasa)) {
            const derived = deriveDefaultUnitName(madrasa);
            updated.push({
              madrasa,
              unit: derived,
              count,
              originalUnit: '',
              isModified: true,
            });
            newlyDiscoveredCount++;
          } else {
            // Update count
            const item = updated.find((m) => m.madrasa === madrasa);
            if (item) item.count = count;
          }
        });

        return updated.sort((a, b) => a.madrasa.localeCompare(b.madrasa));
      });

      const msg = newlyDiscoveredCount > 0
        ? `Found ${newlyDiscoveredCount} new madrasas from participants! Click 'Save & Sync' to persist.`
        : 'Scan complete. All madrasas from participants are already present in the list.';
      
      logger.info('MADRASA_SCAN', msg);
      if (onShowToast) onShowToast(msg, newlyDiscoveredCount > 0 ? 'success' : 'info');
    } catch (err) {
      console.error('Error scanning madrasas:', err);
      if (onShowToast) onShowToast(`Scan failed: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle single unit name change
  const handleUnitChange = (madrasa, newUnit) => {
    const uppercaseUnit = newUnit.toUpperCase();
    setMappings((prev) =>
      prev.map((row) => {
        if (row.madrasa === madrasa) {
          return {
            ...row,
            unit: uppercaseUnit,
            isModified: uppercaseUnit !== row.originalUnit,
          };
        }
        return row;
      })
    );
  };

  // Compute unit frequencies to identify shared units
  const unitFrequencies = useMemo(() => {
    const freq = new Map();
    mappings.forEach((row) => {
      const cleanUnit = (row.unit || '').trim().toUpperCase();
      if (cleanUnit && cleanUnit !== 'UNASSIGNED') {
        freq.set(cleanUnit, (freq.get(cleanUnit) || 0) + 1);
      }
    });
    return freq;
  }, [mappings]);

  // Summary counts
  const stats = useMemo(() => {
    const totalMadrasas = mappings.length;
    const uniqueUnitsSet = new Set(
      mappings
        .map((m) => (m.unit || '').trim().toUpperCase())
        .filter((u) => u && u !== 'UNASSIGNED')
    );
    const unassignedCount = mappings.filter(
      (m) => !m.unit || m.unit.trim().toUpperCase() === 'UNASSIGNED'
    ).length;
    let sharedMadrasasCount = 0;
    mappings.forEach((m) => {
      const u = (m.unit || '').trim().toUpperCase();
      if (u && (unitFrequencies.get(u) || 0) > 1) {
        sharedMadrasasCount++;
      }
    });

    return {
      totalMadrasas,
      totalUnits: uniqueUnitsSet.size,
      unassignedCount,
      sharedMadrasasCount,
    };
  }, [mappings, unitFrequencies]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return mappings.filter((row) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesMadrasa = row.madrasa.toLowerCase().includes(query);
        const matchesUnit = row.unit.toLowerCase().includes(query);
        if (!matchesMadrasa && !matchesUnit) return false;
      }

      // 2. Filter mode
      const cleanUnit = (row.unit || '').trim().toUpperCase();
      if (filterMode === 'UNASSIGNED') {
        return !cleanUnit || cleanUnit === 'UNASSIGNED';
      }
      if (filterMode === 'SHARED') {
        return cleanUnit && (unitFrequencies.get(cleanUnit) || 0) > 1;
      }
      return true;
    });
  }, [mappings, searchQuery, filterMode, unitFrequencies]);

  // Save & Sync Units to All Participants
  const handleSaveAndSync = async () => {
    if (isSaving || mappings.length === 0) return;
    setIsSaving(true);

    try {
      // 1. Prepare batch for madrasa_unit_map
      const mapRowsToUpsert = mappings.map((m) => ({
        madrasa: m.madrasa.trim(),
        unit: (m.unit || 'UNASSIGNED').trim().toUpperCase(),
      }));

      // Upsert in chunks of 100 to avoid payload size issues
      const chunkSize = 100;
      for (let i = 0; i < mapRowsToUpsert.length; i += chunkSize) {
        const chunk = mapRowsToUpsert.slice(i, i + chunkSize);
        const { error: upsertErr } = await supabase
          .from('madrasa_unit_map')
          .upsert(chunk, { onConflict: 'madrasa' });

        if (upsertErr) throw upsertErr;
      }

      // 2. Synchronize participants table for every madrasa
      let updatedParticipantsCount = 0;
      for (const m of mappings) {
        const targetUnit = (m.unit || 'UNASSIGNED').trim().toUpperCase();
        const { error: updateErr, count } = await supabase
          .from('participants')
          .update({ unit: targetUnit })
          .eq('madrasa', m.madrasa.trim());

        if (updateErr) {
          console.warn(`Error syncing participants for madrasa "${m.madrasa}":`, updateErr);
        } else if (count) {
          updatedParticipantsCount += count;
        }
      }

      // 3. Log to diagnostics console
      const successMsg = `Saved ${mappings.length} mappings & synchronized unified units across all participants!`;
      logger.success('MADRASA_UNIT_SYNC', successMsg, {
        totalMappings: mappings.length,
        totalUnits: stats.totalUnits,
        sharedMadrasas: stats.sharedMadrasasCount,
      });

      if (onShowToast) onShowToast(successMsg, 'success');

      // Update original units to clear modified state
      setMappings((prev) =>
        prev.map((row) => ({
          ...row,
          originalUnit: row.unit,
          isModified: false,
        }))
      );

      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err) {
      console.error('Error saving and syncing madrasa mappings:', err);
      logger.error('MADRASA_SYNC_ERROR', err.message);
      if (onShowToast) onShowToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const containerContent = (
    <div className="space-y-6">
      {/* Top Banner / Info */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F26430]/10 text-[#F26430] border border-[#F26430]/20 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg sm:text-xl text-[#1B254B]">
                  Madrasa Mapper
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#F26430]">
                  Rule 19 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Maps each Madrasa Full Name to its clean Madrasa (Short Name). Madrasas sharing the same name cleanly combine points in Championships!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleScanParticipants}
              disabled={isScanning || isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-[#1B254B] transition-all cursor-pointer disabled:opacity-50"
              title="Scan and import any missing madrasas from registered participants"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#F26430]' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan from Participants'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSaving || mappings.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Upsert mappings and update unit on all participants"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing Units...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>💾 Save & Sync Units to All</span>
                </>
              )}
            </button>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Stat Pill Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Madrasas
            </span>
            <span className="font-mono font-black text-lg text-[#1B254B]">
              {stats.totalMadrasas}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Unified Madrasas (Short)
            </span>
            <span className="font-mono font-black text-lg text-emerald-700">
              {stats.totalUnits}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Shared Names (2+ Madrasas)
            </span>
            <span className="font-mono font-black text-lg text-purple-900">
              {stats.sharedMadrasasCount}
            </span>
          </div>

          <div className={`p-3 rounded-2xl text-center border ${
            stats.unassignedCount > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-slate-50 border-slate-200/80 text-slate-600'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              Unassigned / Review
            </span>
            <span className="font-mono font-black text-lg">
              {stats.unassignedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Madrasa Full Name or Short Name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-white text-[#1B254B] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All ({mappings.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('SHARED')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
              filterMode === 'SHARED'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Shared Units ({stats.sharedMadrasasCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('UNASSIGNED')}
            className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
              filterMode === 'UNASSIGNED'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Needs Review ({stats.unassignedCount})
          </button>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-[#F26430]" />
            <p className="text-xs font-semibold text-slate-600">
              Loading Madrasa to Unit Mappings...
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No Madrasa entries found matching filter.</p>
            {mappings.length === 0 && (
              <p>Click "Scan from Participants" above to load all registered Madrasas.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-[#1B254B] text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Madrasa Full Name (Source)</th>
                  <th className="py-3 px-3 w-28 text-center">Students</th>
                  <th className="py-3 px-4 w-72">Assigned Madrasa (Short Name)</th>
                  <th className="py-3 px-3 w-36 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const cleanUnit = (row.unit || '').trim().toUpperCase();
                  const isUnassigned = !cleanUnit || cleanUnit === 'UNASSIGNED';
                  const sharedCount = unitFrequencies.get(cleanUnit) || 0;
                  const isShared = !isUnassigned && sharedCount > 1;

                  return (
                    <tr
                      key={row.madrasa}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUnassigned ? 'bg-amber-50/50' : row.isModified ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Madrasa Name */}
                      <td className="py-3 px-4 font-bold text-[#1B254B]">
                        <div className="flex items-center gap-2">
                          <span>{row.madrasa}</span>
                        </div>
                      </td>

                      {/* Student count */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{row.count}</span>
                        </span>
                      </td>

                      {/* Assigned Unit Short Name Input */}
                      <td className="py-2.5 px-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => handleUnitChange(row.madrasa, e.target.value)}
                            onBlur={(e) => handleUnitChange(row.madrasa, e.target.value.trim())}
                            placeholder="e.g. AKAMBADAM"
                            className={`w-full font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-xl border transition-all ${
                              isUnassigned
                                ? 'bg-white border-amber-400 text-amber-900 focus:ring-2 focus:ring-amber-500'
                                : 'bg-slate-50/80 border-slate-200 text-[#1B254B] focus:bg-white focus:ring-2 focus:ring-[#F26430]'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Needs Unit
                          </span>
                        ) : isShared ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`Shared Unit: ${sharedCount} Madrasas are mapped to ${cleanUnit}`}>
                            <Layers className="w-3 h-3 text-purple-600" />
                            Shared ({sharedCount} Madrasas)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Single
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
          <p>
            Showing {filteredRows.length} of {mappings.length} madrasa mappings
          </p>
          <p className="text-[11px] text-slate-400">
            Tip: Units with 2 Madrasas will automatically combine points into a single Unit on the Championship leaderboards.
          </p>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {containerContent}
          </div>
        </div>
      </div>
    );
  }

  return containerContent;
}