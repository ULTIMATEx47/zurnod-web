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

    // ---- Kanal mesajları ----
    socket.on('yeni_mesaj', (mesaj: any) => {
      dispatch(mesajEkle(mesaj));
    });
    socket.on('mesaj_duzenlendi', (data: any) => {
      // { kanalId, mesaj } veya doğrudan mesaj
      const mesaj = data.mesaj || data;
      dispatch(mesajGuncelle(mesaj));
    });
    socket.on('mesaj_silindi', (data: any) => {
      // string mesajId veya { mesajId }
      const id = typeof data === 'string' ? data : (data.mesajId || data._id || data);
      dispatch(mesajSilRedux(id));
    });

    // ---- DM mesajları ----
    // Backend 'yeni_dm_mesaji' emit ediyor (sonunda 'i' var!)
    socket.on('yeni_dm_mesaji', (data: any) => {
      const mesaj = data.mesaj || data;
      dispatch(dmMesajEkle(mesaj));
      // DM listesini güncelle (son mesaj için)
      if (data.dmId || mesaj.dm) {
        dispatch(dmleriGetirThunk());
      }
    });
    // Eski event ismi de dinle (fallback)
    socket.on('yeni_dm_mesaj', (data: any) => {
      const mesaj = data.mesaj || data;
      dispatch(dmMesajEkle(mesaj));
      if (data.dm) dispatch(dmGuncelleRedux(data.dm));
    });
    socket.on('dm_mesaj_guncellendi', (data: any) => {
      const mesaj = data.mesaj || data;
      dispatch(mesajGuncelle(mesaj));
    });
    socket.on('dm_mesaj_silindi', (data: any) => {
      const id = typeof data === 'string' ? data : (data.mesajId || data._id || data);
      dispatch(dmMesajSilRedux(id));
    });

    // ---- Reaksiyonlar ----
    socket.on('mesaj_guncellendi', (mesaj: any) => dispatch(mesajGuncelle(mesaj)));
    socket.on('reaksiyon_guncellendi', (data: any) => dispatch(reaksiyonGuncelle(data)));

    // ---- Online/Offline durumu ----
    // Backend 'arkadasDurumGuncelle' emit ediyor, { kullaniciId, durum }
    socket.on('arkadasDurumGuncelle', (data: any) => {
      const { kullaniciId, durum } = data;
      if (durum === 'gorunmez' || durum === 'offline') {
        dispatch(kullaniciCevrimiciBosalt(kullaniciId));
      } else {
        dispatch(kullaniciCevrimiciEkle(kullaniciId));
      }
    });
    // Fallback eski event isimleri
    socket.on('cevrimici_kullanicilar', (ids: string[]) => dispatch(setCevrimiciKullanicilar(ids)));
    socket.on('kullanici_cevrimici', (id: string) => dispatch(kullaniciCevrimiciEkle(id)));
    socket.on('kullanici_cevrimdisi', (id: string) => dispatch(kullaniciCevrimiciBosalt(id)));

    // ---- Bildirimler ----
    socket.on('yeni_bildirim', (b: any) => dispatch(bildirimEkle(b)));

    // ---- Sunucu güncellemeleri ----
    socket.on('sunucu_guncellendi', () => dispatch(sunuculariGetirThunk()));
    socket.on('kanal_olusturuldu', () => {/* handled by SunucularPage */});

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
