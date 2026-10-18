import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, setKullanici } from '../store';
import * as api from '../utils/api';
import AdminPaneli from '../components/AdminPaneli';
import s from './ProfilPage.module.css';

export default function ProfilPage() {
  const dispatch = useDispatch<AppDispatch>();
  const kullanici = useSelector((s: RootState) => s.app.kullanici);

  const [duzenleme, setDuzenleme] = useState(false);
  const [form, setForm] = useState({
    goruntulenenAd: kullanici?.goruntulenenAd || '',
    kullaniciAdi: kullanici?.kullaniciAdi || '',
    hakkinda: (kullanici as any)?.hakkinda || '',
    ozelDurum: kullanici?.ozelDurum || '',
    durum: kullanici?.durum || 'cevrimici',
  });
  const [premiumKod, setPremiumKod] = useState('');
  const [premiumMesaj, setPremiumMesaj] = useState('');
  const [sifreDegistir, setSifreDegistir] = useState(false);
  const [sifreForm, setSifreForm] = useState({ mevcutSifre: '', yeniSifre: '' });
  const [yukleniyor, setYukleniyor] = useState(false);
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false);

  const kaydet = async () => {
    setYukleniyor(true);
    try {
      const yanit = await api.profilGuncelle(form);
      dispatch(setKullanici({ ...kullanici!, ...yanit }));
      setDuzenleme(false);
    } catch (e) { console.error(e); }
    finally { setYukleniyor(false); }
  };

  const avatarDegistir = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      setAvatarYukleniyor(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          const url = await api.gorselYukle(base64);
          const yanit = await api.profilGuncelle({ avatar: url });
          dispatch(setKullanici({ ...kullanici!, avatar: url }));
        };
        reader.readAsDataURL(file);
      } catch {} finally { setAvatarYukleniyor(false); }
    };
    input.click();
  };

  const premiumKodKullan = async () => {
    if (!premiumKod.trim()) return;
    try {
      await api.premiumKodKullan(premiumKod.trim());
      setPremiumMesaj('✅ Premium aktifleştirildi!');
      setPremiumKod('');
      const profil = await api.tokenKontrol();
      if (profil) dispatch(setKullanici({ ...kullanici!, ...profil, id: kullanici!.id }));
    } catch (e: any) {
      setPremiumMesaj('❌ ' + (e.message || 'Kod geçersiz'));
    }
  };

  const sifreDegistirKaydet = async () => {
    if (!sifreForm.mevcutSifre || !sifreForm.yeniSifre) return;
    try {
      await api.sifreDegistir(sifreForm.mevcutSifre, sifreForm.yeniSifre);
      setSifreDegistir(false);
      setSifreForm({ mevcutSifre: '', yeniSifre: '' });
      alert('Şifre değiştirildi!');
    } catch (e: any) { alert(e.message || 'Şifre değiştirilemedi'); }
  };

  const durumlar = [
    { id: 'cevrimici', label: '🟢 Çevrimiçi' },
    { id: 'uzakta', label: '🟡 Uzakta' },
    { id: 'rahatsiz_etme', label: '🔴 Rahatsız Etme' },
    { id: 'gorunmez', label: '⚫ Görünmez' },
  ];

  return (
    <div className={s.container}>
      <div className={s.inner}>
        {/* Profil kartı */}
        <div className={s.kart}>
          {/* Banner */}
          <div className={s.bannerArea} style={{ background: (kullanici as any)?.profilBanner ? `url(${(kullanici as any).profilBanner}) center/cover` : 'linear-gradient(135deg,#C04E0D,#E8621A)' }}>
          </div>

          {/* Avatar */}
          <div className={s.avatarRow}>
            <div className={s.avatarWrap}>
              <button className={s.avatarBtn} onClick={avatarDegistir} disabled={avatarYukleniyor}>
                {kullanici?.avatar
                  ? <img src={kullanici.avatar} alt="" className={s.avatar} />
                  : <div className={s.avatarPlaceholder}>{(kullanici?.goruntulenenAd || '?')[0].toUpperCase()}</div>
                }
                <div className={s.avatarOverlay}>{avatarYukleniyor ? '...' : '📷'}</div>
              </button>
            </div>
            <div style={{ flex: 1 }} />
            {kullanici?.isPremium && <span className={s.premiumBadge}>⭐ Premium</span>}
            {!duzenleme && (
              <button className={s.duzenlemeBtn} onClick={() => setDuzenleme(true)}>Profili Düzenle</button>
            )}
          </div>

          {/* Bilgiler */}
          <div className={s.bilgiler}>
            {duzenleme ? (
              <div className={s.formAlan}>
                <div className={s.field}><label className={s.label}>GÖRÜNTÜLENEN AD</label>
                  <input className={s.input} value={form.goruntulenenAd} onChange={e => setForm(f => ({ ...f, goruntulenenAd: e.target.value }))} /></div>
                <div className={s.field}><label className={s.label}>KULLANICI ADI</label>
                  <input className={s.input} value={form.kullaniciAdi} onChange={e => setForm(f => ({ ...f, kullaniciAdi: e.target.value }))} /></div>
                <div className={s.field}><label className={s.label}>HAKKINDA</label>
                  <textarea className={s.textarea} value={form.hakkinda} onChange={e => setForm(f => ({ ...f, hakkinda: e.target.value }))} rows={3} /></div>
                <div className={s.field}><label className={s.label}>ÖZEL DURUM</label>
                  <input className={s.input} value={form.ozelDurum} onChange={e => setForm(f => ({ ...f, ozelDurum: e.target.value }))} placeholder="Ne yapıyorsun?" /></div>
                <div className={s.field}><label className={s.label}>DURUM</label>
                  <select className={s.input} value={form.durum} onChange={e => setForm(f => ({ ...f, durum: e.target.value as any }))}>
                    {durumlar.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select></div>
                <div className={s.btnRow}>
                  <button className={s.kaydetBtn} onClick={kaydet} disabled={yukleniyor}>{yukleniyor ? '...' : 'Kaydet'}</button>
                  <button className={s.iptalBtn} onClick={() => setDuzenleme(false)}>İptal</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className={s.ad}>{kullanici?.goruntulenenAd}</h2>
                <p className={s.kullaniciAdi}>@{kullanici?.kullaniciAdi}</p>
                {kullanici?.ozelDurum && <p className={s.ozelDurum}>{kullanici.ozelDurum}</p>}
                {(kullanici as any)?.hakkinda && <p className={s.hakkinda}>{(kullanici as any).hakkinda}</p>}
                <p className={s.email}>{kullanici?.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Şifre değiştir */}
        <div className={s.bolum}>
          <div className={s.bolumBaslik}>
            <span>Güvenlik</span>
            <button className={s.toggleBtn} onClick={() => setSifreDegistir(p => !p)}>
              {sifreDegistir ? 'İptal' : 'Şifre Değiştir'}
            </button>
          </div>
          {sifreDegistir && (
            <div className={s.formAlan}>
              <div className={s.field}><label className={s.label}>MEVCUT ŞİFRE</label>
                <input type="password" className={s.input} value={sifreForm.mevcutSifre} onChange={e => setSifreForm(f => ({ ...f, mevcutSifre: e.target.value }))} /></div>
              <div className={s.field}><label className={s.label}>YENİ ŞİFRE</label>
                <input type="password" className={s.input} value={sifreForm.yeniSifre} onChange={e => setSifreForm(f => ({ ...f, yeniSifre: e.target.value }))} /></div>
              <button className={s.kaydetBtn} onClick={sifreDegistirKaydet}>Kaydet</button>
            </div>
          )}
        </div>

        {/* Premium */}
        {!kullanici?.isPremium && (
          <div className={s.bolum}>
            <div className={s.bolumBaslik}><span>🌟 Premium Kodu Kullan</span></div>
            <div className={s.premiumRow}>
              <input className={s.input} placeholder="Premium kod gir..." value={premiumKod} onChange={e => setPremiumKod(e.target.value)} onKeyDown={e => e.key === 'Enter' && premiumKodKullan()} />
              <button className={s.kaydetBtn} onClick={premiumKodKullan}>Aktifleştir</button>
            </div>
            {premiumMesaj && <p style={{ marginTop: 8, fontSize: 13, color: premiumMesaj.startsWith('✅') ? '#43B581' : '#F04747' }}>{premiumMesaj}</p>}
          </div>
        )}

        {/* Admin paneli */}
        {kullanici?.isAdmin && (
          <div className={s.bolum}>
            <div className={s.bolumBaslik}><span>🛡️ Yönetici Paneli</span></div>
            <AdminPaneli />
          </div>
        )}
      </div>
    </div>
  );
}
