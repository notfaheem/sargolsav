import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicPortal from './pages/PublicPortal';
import AdminPortal from './pages/AdminPortal';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Results & Festival Portal */}
        <Route path="/" element={<PublicPortal />} />

        {/* Stealth Admin Portal (accessible only via direct URL) */}
        <Route path="/admin" element={<AdminPortal />} />

        {/* Catch all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
