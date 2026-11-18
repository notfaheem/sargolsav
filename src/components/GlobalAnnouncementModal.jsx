import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function GlobalAnnouncementModal({ isOpen, onClose, popupData }) {
  if (!isOpen || !popupData) return null;

  const {
    heading,
    message,
    imageUrl,
    btn1Text,
    btn1Url,
    btn2Text,
    btn2Url,
  } = popupData;

  const handleActionClick = (url) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-[90%] mx-auto relative z-50 text-center overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Optional Header Image (Flush with top edges, no padding) */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Notice"
            className="w-full h-48 md:h-56 object-cover"
          />
        )}

        {/* Text Container */}
        <div className="p-6 md:p-8 flex flex-col">
          {heading && (
            <h2 className="text-2xl font-black text-slate-900 mb-2 leading-snug">
              {heading}
            </h2>
          )}

          {message && (
            <div className="text-slate-600 mb-6 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {message}
            </div>
          )}

          {/* Buttons Container */}
          <div className="flex flex-col gap-3 justify-center items-center w-full">
            {btn1Text && btn1Url && (
              <button
                type="button"
                onClick={() => handleActionClick(btn1Url)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-bold w-full sm:w-auto shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {btn1Text}
              </button>
            )}

            {btn2Text && btn2Url && (
              <button
                type="button"
                onClick={() => handleActionClick(btn2Url)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-6 py-2.5 font-bold w-full sm:w-auto transition-all cursor-pointer"
              >
                {btn2Text}
              </button>
            )}

            {/* Explicit Close Option */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold mt-2 uppercase tracking-wide cursor-pointer transition-colors"
            >
              Dismiss / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
