import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  FolderArchive,
  Upload,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function AdminResourceManager({ onShowToast }) {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Resource Form state
  const [title, setTitle] = useState('');
  const [uploadMode, setUploadMode] = useState('FILE'); // 'FILE' | 'LINK'
  const [selectedFile, setSelectedFile] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalType, setExternalType] = useState('pdf'); // 'pdf' | 'image'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all resources
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      logger.error('RESOURCES_FETCH', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle Form Submission
  const handleAddResource = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Please provide a document title (e.g. "Sargolsav 2026 Rules Manual").');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUrl = '';
      let detectedType = 'pdf';

      if (uploadMode === 'FILE') {
        if (!selectedFile) {
          throw new Error('Please select a PDF or Image file to upload.');
        }

        const ext = selectedFile.name.split('.').pop().toLowerCase();
        detectedType = ext === 'pdf' ? 'pdf' : 'image';

        // Sanitize file name
        const timestamp = Date.now();
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `documents/${timestamp}_${safeName}`;

        // Upload to Supabase Storage bucket 'resources'
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('resources')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: selectedFile.type,
          });

        if (uploadErr) {
          // If storage bucket isn't configured, provide clear actionable guidance
          throw new Error(
            `Supabase Storage upload failed (${uploadErr.message}). You can use the "External Link" option below to link a Google Drive or external file instead!`
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        finalUrl = urlData.publicUrl;
      } else {
        // External Link Mode
        const cleanUrl = externalUrl.trim();
        if (!cleanUrl || !cleanUrl.startsWith('http')) {
          throw new Error('Please enter a valid HTTP or HTTPS URL.');
        }
        finalUrl = cleanUrl;
        detectedType = externalType;
      }

      // Insert into resources table
      const { data: inserted, error: insertErr } = await supabase
        .from('resources')
        .insert([
          {
            title: cleanTitle,
            file_url: finalUrl,
            file_type: detectedType,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;

      logger.info(
        'RESOURCE_ADDED',
        `Added resource "${cleanTitle}" (${detectedType}) -> ${finalUrl}`
      );

      if (onShowToast) {
        onShowToast(`Resource "${cleanTitle}" published successfully!`, 'success');
      }

      // Reset form
      setTitle('');
      setSelectedFile(null);
      setExternalUrl('');
      setFormError('');

      // Refresh list
      await fetchResources();
    } catch (err) {
      console.error('Error adding resource:', err);
      setFormError(err.message || 'Failed to publish resource.');
      logger.error('RESOURCE_ADD_ERROR', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resource Deletion
  const handleDeleteResource = async () => {
    if (!deletingItem || isDeleting) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', deletingItem.id);

      if (error) throw error;

      logger.warn(
        'RESOURCE_DELETED',
        `Deleted resource #${deletingItem.id} "${deletingItem.title}"`
      );

      if (onShowToast) {
        onShowToast(`Deleted "${deletingItem.title}".`, 'success');
      }

      setDeletingItem(null);
      await fetchResources();
    } catch (err) {
      console.error('Error deleting resource:', err);
      logger.error('RESOURCE_DELETE_ERROR', err.message);
      if (onShowToast) {
        onShowToast(`Failed to delete: ${err.message}`, 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Add Resource Form */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
              Upload & Manage Festival Resources
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish official festival documents, rule manuals, stage schedules, or venue maps for public viewing and download
            </p>
          </div>
        </div>

        <form onSubmit={handleAddResource} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{formError}</div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Document / Resource Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sargolsav 2026 Official Rules Manual & Guidelines"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430] transition-all font-medium"
              required
            />
          </div>

          {/* Mode Switcher: File Upload vs External Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Upload Method
            </label>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setUploadMode('FILE')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  uploadMode === 'FILE'
                    ? 'bg-white text-[#1B254B] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#F26430]" />
                <span>📁 Direct File Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('LINK')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  uploadMode === 'LINK'
                    ? 'bg-white text-[#1B254B] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-teal-600" />
                <span>🔗 External Link (Drive / Web)</span>
              </button>
            </div>
          </div>

          {/* File Upload Input */}
          {uploadMode === 'FILE' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Select PDF or Image File (.pdf, .png, .jpg, .jpeg)
              </label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1B254B] file:text-white hover:file:bg-navy-800 file:cursor-pointer cursor-pointer"
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          {/* External Link Input */}
          {uploadMode === 'LINK' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Direct Web or Google Drive Link
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://example.com/manual.pdf"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1B254B] focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={externalType}
                  onChange={(e) => setExternalType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold"
                >
                  <option value="pdf">📄 PDF Document</option>
                  <option value="image">🖼️ Image / Map</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#1B254B] hover:bg-navy-800 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                  <span>Publishing Resource...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#F26430]" />
                  <span>Publish Resource</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Resources List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
              Published Festival Resources
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Available to public visitors on the main website
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {resources.length} Published
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-[#F26430]" />
            <p className="text-xs font-medium text-slate-500">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center space-y-3 text-slate-400">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FolderArchive className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No resources uploaded yet</p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              Use the form above to upload official PDFs, order of events, or festival guidelines.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {resources.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.file_type === 'image'
                        ? 'bg-purple-50 text-purple-600 border border-purple-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {item.file_type === 'image' ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-[#1B254B] truncate">
                        {item.title}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          item.file_type === 'image'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.file_type}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploaded on {new Date(item.created_at).toLocaleDateString('en-GB')} at{' '}
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Preview / Open in New Tab"
                  >
                    <span>Open / Preview</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B254B]">
                Delete Resource?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">"{deletingItem.title}"</strong>? It will no longer be visible to public users.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteResource}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
