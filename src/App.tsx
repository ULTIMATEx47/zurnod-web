import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, tokenKontrolThunk } from './store';
import { socketBaglan } from './utils/api';
import Layout from './components/Layout';
import GirisPage from './pages/GirisPage';
import KayitPage from './pages/KayitPage';
import DMPage from './pages/DMPage';
import SunucularPage from './pages/SunucularPage';
import ArkadaslarPage from './pages/ArkadaslarPage';
import BildirimlerPage from './pages/BildirimlerPage';
import ProfilPage from './pages/ProfilPage';
import DurumPage from './pages/DurumPage';
import AramaPage from './pages/AramaPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  if (!kullanici) return <Navigate to="/giris" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  if (kullanici) return <Navigate to="/dm" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const loading = useSelector((s: RootState) => s.app.yukleniyor);

  useEffect(() => {
    dispatch(tokenKontrolThunk());
  }, []);

  useEffect(() => {
    if (kullanici) {
      const token = localStorage.getItem('token');
      if (token) socketBaglan(token);
    }
  }, [kullanici]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#1A1008' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/giris" element={<GuestGuard><GirisPage /></GuestGuard>} />
      <Route path="/kayit" element={<GuestGuard><KayitPage /></GuestGuard>} />
      <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
        <Route index element={<Navigate to="/dm" replace />} />
        <Route path="dm" element={<DMPage />} />
        <Route path="dm/:dmId" element={<DMPage />} />
        <Route path="sunucular" element={<SunucularPage />} />
        <Route path="sunucular/:sunucuId" element={<SunucularPage />} />
        <Route path="sunucular/:sunucuId/:kanalId" element={<SunucularPage />} />
        <Route path="arkadaslar" element={<ArkadaslarPage />} />
        <Route path="bildirimler" element={<BildirimlerPage />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="durum" element={<DurumPage />} />
        <Route path="arama" element={<AramaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dm" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
