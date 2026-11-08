import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, UserPlus, Edit3, CheckSquare, Square } from 'lucide-react';
import { CATEGORIES } from './CategorySelector';

export default function ParticipantModal({
  isOpen,
  onClose,
  participant = null, // null for Add, object for Edit
  availableItems = [], // all items from Supabase
  onSave,
  isSubmitting = false,
}) {
  const isEdit = Boolean(participant);

  const [formData, setFormData] = useState({
    reg_no: '',
    name: '',
    category: 'KIDS',
    district: 'MALAPPURAM',
    zone: 'NILAMBUR',
    unit: '',
    madrasa: '',
  });

  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (participant) {
      setFormData({
        reg_no: participant.reg_no || '',
        name: participant.name || '',
        category: participant.category || 'KIDS',
        district: participant.district || 'MALAPPURAM',
        zone: participant.zone || 'NILAMBUR',
        unit: participant.unit || '',
        madrasa: participant.madrasa || '',
      });
      setSelectedItemCodes(participant.enrolled_items || participant.items || []);
    } else {
      setFormData({
        reg_no: '',
        name: '',
        category: 'KIDS',
        district: 'MALAPPURAM',
        zone: 'NILAMBUR',
        unit: '',
        madrasa: '',
      });
      setSelectedItemCodes([]);
    }
    setErrorMsg('');
  }, [participant, isOpen]);

  if (!isOpen) return null;

  // Filter items matching the selected category
  const categoryItems = availableItems.filter(
    (item) => item.category === formData.category
  );

  const toggleItem = (code) => {
    setSelectedItemCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const regNo = parseInt(String(formData.reg_no).replace(/[^0-9]/g, ''), 10);
    if (!regNo || isNaN(regNo)) {
      setErrorMsg('Please enter a valid numeric Registration / Unique ID');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg('Please enter participant name');
      return;
    }

    if (!formData.unit.trim()) {
      setErrorMsg('Please enter unit name (e.g. AKAMBADAM)');
      return;
    }

    onSave({
      ...formData,
      reg_no: regNo,
      name: formData.name.trim().toUpperCase(),
      unit: formData.unit.trim().toUpperCase(),
      madrasa: formData.madrasa.trim(),
      items: selectedItemCodes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1B254B] text-white">
              {isEdit ? <Edit3 className="w-4 h-4 text-[#F26430]" /> : <UserPlus className="w-4 h-4 text-[#F26430]" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1B254B]">
                {isEdit ? 'Edit Participant Details' : 'Add Single Participant'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? `Updating participant #${formData.reg_no}`
                  : 'Manually register a single participant into the database'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reg No */}
            <div>
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
                Unique Reg No <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.reg_no}
                onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
                disabled={isEdit || isSubmitting}
                placeholder="e.g. 10252"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B] disabled:opacity-60"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setFormData({ ...formData, category: newCat });
                  // Filter out items not in new category
                  const validCodes = availableItems
                    .filter((i) => i.category === newCat)
                    .map((i) => i.code);
                  setSelectedItemCodes((prev) => prev.filter((c) => validCodes.includes(c)));
                }}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participant Name */}
          <div>
            <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
              Participant Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              placeholder="e.g. DIYA FATHIMA"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
                Unit Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isSubmitting}
                placeholder="e.g. AKAMBADAM"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
              />
            </div>

            {/* Madrasa / Institution */}
            <div>
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider mb-1">
                Madrasa / Institution
              </label>
              <input
                type="text"
                value={formData.madrasa}
                onChange={(e) => setFormData({ ...formData, madrasa: e.target.value })}
                disabled={isSubmitting}
                placeholder="e.g. ANVARUL HUDA"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1B254B]"
              />
            </div>
          </div>

          {/* Item Enrollment Checkboxes */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#1B254B] uppercase tracking-wider">
                Select Enrolled Items ({formData.category})
              </label>
              <span className="text-[11px] font-semibold text-[#F26430]">
                {selectedItemCodes.length} items selected
              </span>
            </div>

            {categoryItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No items found for {formData.category}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {categoryItems.map((item) => {
                  const isChecked = selectedItemCodes.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleItem(item.code)}
                      className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all border ${
                        isChecked
                          ? 'bg-orange-50 border-orange-300 text-[#1B254B]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="mt-0.5 text-[#F26430]">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-[#1B254B]">
                            #{item.code}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            {item.mode}
                          </span>
                        </div>
                        <p className="text-xs font-bold font-ml text-[#1B254B] truncate mt-0.5">
                          {item.name_ml}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.name_en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F26430]" />
                  <span>Saving Participant...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#F26430]" />
                  <span>{isEdit ? 'Update Participant' : 'Save Participant'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
