import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FolderArchive,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Eye,
  X,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function PublicResourcesTab() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inline Preview Modal state
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    async function fetchPublicResources() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('id, title, file_url, file_type, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setResources(data || []);
      } catch (err) {
        console.error('Error fetching public resources:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublicResources();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center shrink-0">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1B254B]">
              Festival Resources & Guidelines
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Official manuals, mark sheets, stage schedules, and venue map downloads
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Documents</span>
        </div>
      </div>

      {/* Resources Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#F26430]" />
          <p className="text-sm font-semibold text-slate-600">
            Loading Official Festival Resources...
          </p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
            <FolderArchive className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1B254B]">
            No Documents Published Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Official festival rule books, order of events, program schedules, and venue maps will be published here by the Sargolsav committee.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    item.file_type === 'image'
                      ? 'bg-purple-50 text-purple-600 border border-purple-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {item.file_type === 'image' ? (
                    <ImageIcon className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.file_type === 'image'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : 'bg-red-100 text-red-900 border border-red-200'
                      }`}
                    >
                      {item.file_type === 'image' ? 'Image / Map' : 'PDF Document'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#1B254B] leading-snug group-hover:text-[#F26430] transition-colors">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(item)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-[#1B254B] transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#F26430]" />
                  <span>Preview Inline</span>
                </button>

                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1B254B] hover:bg-navy-800 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Open</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Resource Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#1B254B] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/10 text-[#F26430] shrink-0">
                  {previewItem.file_type === 'image' ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {previewItem.title}
                  </h3>
                  <span className="text-xs text-slate-300 uppercase">
                    {previewItem.file_type === 'image' ? 'Image Viewer' : 'Document Viewer'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewItem.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                  title="Open in new window"
                >
                  <span>Open Full</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Viewer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex items-center justify-center min-h-[60vh]">
              {previewItem.file_type === 'image' ? (
                <img
                  src={previewItem.file_url}
                  alt={previewItem.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-lg border border-slate-300"
                />
              ) : (
                <iframe
                  src={previewItem.file_url}
                  title={previewItem.title}
                  className="w-full h-[75vh] rounded-2xl border border-slate-300 bg-white shadow-sm"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Sargolsav 2026 Official Document</span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-1.5 rounded-xl font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
