import React, { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  RootState, AppDispatch,
  sunuculariGetirThunk, dmleriGetirThunk, bildirimleriGetirThunk,
  mesajEkle, dmMesajEkle, mesajGuncelle, mesajSilRedux, dmMesajSilRedux,
  reaksiyonGuncelle, setCevrimiciKullanicilar, kullaniciCevrimiciEkle,
  kullaniciCevrimiciBosalt, bildirimEkle, dmGuncelleRedux, cikisYap
} from '../store';
import { socketAl, socketBaglan, cikisYap as apiCikis } from '../utils/api';
import styles from './Layout.module.css';

const navItems = [
  { path: '/dm', icon: '💬', label: 'Mesajlar' },
  { path: '/sunucular', icon: '🌐', label: 'Sunucular' },
  { path: '/arkadaslar', icon: '👥', label: 'Arkadaşlar' },
  { path: '/durum', icon: '🎭', label: 'Durumlar' },
  { path: '/bildirimler', icon: '🔔', label: 'Bildirimler' },
  { path: '/arama', icon: '🔍', label: 'Ara' },
];

export default function Layout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const okunmamisSayisi = useSelector((s: RootState) => s.app.okunmamisBildirimSayisi);
  const socketSetupDone = useRef(false);

  useEffect(() => {
    dispatch(sunuculariGetirThunk());
    dispatch(dmleriGetirThunk());
    dispatch(bildirimleriGetirThunk());
  }, []);

  useEffect(() => {
    if (!kullanici || socketSetupDone.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = socketBaglan(token);
    socketSetupDone.current = true;

    socket.on('yeni_mesaj', (mesaj: any) => dispatch(mesajEkle(mesaj)));
    socket.on('yeni_dm_mesaj', (data: any) => {
      const mesaj = data.mesaj || data;
      dispatch(dmMesajEkle(mesaj));
      if (data.dm) dispatch(dmGuncelleRedux(data.dm));
    });
    socket.on('mesaj_guncellendi', (mesaj: any) => dispatch(mesajGuncelle(mesaj)));
    socket.on('mesaj_silindi', (data: any) => {
      const id = data.mesajId || data;
      dispatch(mesajSilRedux(id));
      dispatch(dmMesajSilRedux(id));
    });
    socket.on('reaksiyon_guncellendi', (data: any) => dispatch(reaksiyonGuncelle(data)));
    socket.on('cevrimici_kullanicilar', (ids: string[]) => dispatch(setCevrimiciKullanicilar(ids)));
    socket.on('kullanici_cevrimici', (id: string) => dispatch(kullaniciCevrimiciEkle(id)));
    socket.on('kullanici_cevrimdisi', (id: string) => dispatch(kullaniciCevrimiciBosalt(id)));
    socket.on('yeni_bildirim', (b: any) => dispatch(bildirimEkle(b)));

    return () => { socket.off(); };
  }, [kullanici]);

  const handleCikis = () => {
    apiCikis();
    dispatch(cikisYap());
    navigate('/giris');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.logo} onClick={() => navigate('/dm')}>
          <span style={{ fontSize: 24 }}>🎵</span>
        </div>
        <div className={styles.divider} />
        {navItems.map(item => (
          <button
            key={item.path}
            className={`${styles.navBtn} ${isActive(item.path) ? styles.navBtnActive : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.path === '/bildirimler' && okunmamisSayisi > 0 && (
              <span className={styles.badge}>{okunmamisSayisi > 9 ? '9+' : okunmamisSayisi}</span>
            )}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className={styles.navBtn}
          onClick={() => navigate('/profil')}
          title="Profil"
        >
          {kullanici?.avatar
            ? <img src={kullanici.avatar} alt="avatar" className={styles.avatarBtn} />
            : <span style={{ fontSize: 20 }}>👤</span>
          }
        </button>
        <button className={styles.navBtn} onClick={handleCikis} title="Çıkış Yap">
          <span style={{ fontSize: 18 }}>🚪</span>
        </button>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
