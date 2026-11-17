import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Menu from './pages/Menu.jsx';
import Admin from './pages/Admin.jsx';
import { initialLang } from './lib/i18n.js';

document.documentElement.lang = initialLang();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/menu" element={<Menu />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
