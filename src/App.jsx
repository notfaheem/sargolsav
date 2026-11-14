import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicPortal from './pages/PublicPortal';
import AdminPortal from './pages/AdminPortal';

// Code-split Winner Toolkit to keep main results page light and fast
const PosterMaker = lazy(() => import('./pages/PosterMaker'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-semibold">Loading Poster Toolkit...</div>}>
        <Routes>
          {/* Public Results & Festival Portal */}
          <Route path="/" element={<PublicPortal />} />

          {/* Privacy-Focused Public Winner Toolkit */}
          <Route path="/poster" element={<PosterMaker />} />

          {/* Stealth Admin Portal (accessible only via direct URL) */}
          <Route path="/admin" element={<AdminPortal />} />

          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
