import React from 'react';
import { X } from 'lucide-react';

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
    if (!url || !url.trim()) {
      onClose();
      return;
    }
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = cleanUrl;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Floating Top-Right Close Icon (✕) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
          title="Close"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Optional Image */}
        {imageUrl && imageUrl.trim() && (
          <img
            src={imageUrl.trim()}
            alt="Notice"
            className="w-full max-h-60 object-cover rounded-t-2xl"
          />
        )}

        {/* Body Content */}
        <div className="p-6 md:p-7 flex flex-col text-center">
          {heading && heading.trim() && (
            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
              {heading}
            </h2>
          )}

          {message && message.trim() && (
            <div className="text-sm md:text-base text-slate-600 whitespace-pre-line mt-2 leading-relaxed">
              {message}
            </div>
          )}

          {/* Action & Close Buttons */}
          <div className="flex flex-col gap-2.5 w-full mt-6">
            {btn1Text && btn1Text.trim() && (
              <button
                type="button"
                onClick={() => handleActionClick(btn1Url)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl w-full transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                {btn1Text}
              </button>
            )}

            {btn2Text && btn2Text.trim() && (
              <button
                type="button"
                onClick={() => handleActionClick(btn2Url)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-6 rounded-xl w-full transition-all duration-150 cursor-pointer active:scale-[0.99]"
              >
                {btn2Text}
              </button>
            )}

            {/* Always Include a Close/Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 font-semibold py-2 text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
