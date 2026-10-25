import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as api from '../utils/api';
import s from './DurumPage.module.css';

function formatTarih(tarih: string | undefined) {
  if (!tarih) return '';
  const d = new Date(tarih);
  if (isNaN(d.getTime())) return '';
  const simdi = new Date();
  const fark = simdi.getTime() - d.getTime();
  if (fark < 60000) return 'Az önce';
  if (fark < 3600000) return `${Math.floor(fark / 60000)} dk önce`;
  if (d.toDateString() === simdi.toDateString())
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function DurumPage() {
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const [durumlar, setDurumlar] = useState<any[]>([]);
  const [seciliDurum, setSeciliDurum] = useState<any>(null);
  const [yeniDurumText, setYeniDurumText] = useState('');
  const [yeniDurumRenk, setYeniDurumRenk] = useState('#E8621A');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [goruluyorModal, setGoruluyorModal] = useState<any>(null);
  const [goruluyorListesi, setGoruluyorListesi] = useState<any[]>([]);

  useEffect(() => { fetchDurumlar(); }, []);

  const fetchDurumlar = async () => {
    try {
      const d = await api.durumlariGetir();
      setDurumlar(Array.isArray(d) ? d : []);
    } catch {}
  };

  const gorselYukle = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      setYukleniyor(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          const url = await api.gorselYukle(base64);
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel';
          await api.durumPaylas(tip, url, yeniDurumRenk);
          fetchDurumlar();
        };
        reader.readAsDataURL(file);
      } catch {} finally { setYukleniyor(false); }
    };
    input.click();
  };

  const metinDurumGonder = async () => {
    if (!yeniDurumText.trim()) return;
    setYukleniyor(true);
    try {
      await api.durumPaylas('metin', yeniDurumText.trim(), yeniDurumRenk);
      setYeniDurumText('');
      fetchDurumlar();
    } catch {} finally { setYukleniyor(false); }
  };

  const goruluyorAc = async (durum: any) => {
    try {
      const liste = await api.istek('GET', `/api/durumlar/${durum._id}/gorenler`);
      setGoruluyorListesi(Array.isArray(liste) ? liste : []);
      setGoruluyorModal(durum);
    } catch {}
  };

  const durumSil = async (id: string) => {
    try {
      await api.durumSil(id);
      fetchDurumlar();
      setSeciliDurum(null);
    } catch {}
  };

  const durumGor = async (durum: any) => {
    try {
      await api.durumGor(durum._id);
    } catch {}
    setSeciliDurum(durum);
  };

  // Durumları kişiye göre grupla
  const gruplar: { [key: string]: any[] } = {};
  durumlar.forEach(d => {
    const sahip = d.kullanici?._id || d.kullanici?.id || 'bilinmeyen';
    if (!gruplar[sahip]) gruplar[sahip] = [];
    gruplar[sahip].push(d);
  });

  const RENKLER = ['#E8621A', '#F5A623', '#43B581', '#5865F2', '#ED4245', '#FAA61A', '#1ABC9C', '#9B59B6'];

  const renderDurumIcerik = (d: any) => {
    if (!d) return null;
    const tip = d.tip || d.gercekTip || 'metin';
    if (tip === 'gorsel' || (d.icerik?.match && d.icerik.match(/\.(jpg|jpeg|png|gif|webp)/i))) {
      return <img src={d.icerik} alt="durum" className={s.durumGorsel} />;
    }
    if (tip === 'video' || (d.icerik?.match && d.icerik.match(/\.(mp4|webm|mov)/i))) {
      return <video src={d.icerik} controls className={s.durumVideo} />;
    }
    return <p className={s.durumMetin}>{d.icerik}</p>;
  };

  return (
    <div className={s.container}>
      {/* Sol: durum oluştur + liste */}
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <span className={s.panelBaslik}>Durumlar</span>
        </div>

        {/* Yeni durum */}
        <div className={s.yeniDurum}>
          <div className={s.renkler}>
            {RENKLER.map(r => (
              <button key={r} className={`${s.renkBtn} ${yeniDurumRenk === r ? s.renkBtnAktif : ''}`}
                style={{ background: r }} onClick={() => setYeniDurumRenk(r)} />
            ))}
          </div>
          <div className={s.inputRow}>
            <input
              className={s.durumInput}
              placeholder="Metin durumu yaz..."
              value={yeniDurumText}
              onChange={e => setYeniDurumText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && metinDurumGonder()}
            />
            <button className={s.mediaBtn} onClick={gorselYukle} title="Fotoğraf/Video">📷</button>
            <button className={s.gonderBtn} onClick={metinDurumGonder} disabled={!yeniDurumText.trim() || yukleniyor}>
              {yukleniyor ? '...' : '➤'}
            </button>
          </div>
        </div>

        {/* Durum listesi */}
        <div className={s.durumCemberleri}>
          {Object.entries(gruplar).map(([sahipId, durumGrubu]) => {
            const ilkDurum = durumGrubu[0];
            const kisi = ilkDurum?.kullanici;
            const benimMi = sahipId === kullanici?.id || sahipId === kullanici?._id;
            return (
              <button key={sahipId} className={`${s.durumCember} ${benimMi ? s.benimDurum : ''}`}
                onClick={() => durumGor(ilkDurum)}>
                <div className={s.cemberAvatar} style={{ borderColor: benimMi ? '#E8621A' : '#F5A623' }}>
                  {kisi?.avatar
                    ? <img src={kisi.avatar} alt="" className={s.cemberImg} />
                    : <div className={s.cemberPlaceholder}>{(kisi?.goruntulenenAd || '?')[0].toUpperCase()}</div>
                  }
                </div>
                <span className={s.cemberAd}>{benimMi ? 'Sen' : (kisi?.goruntulenenAd || kisi?.kullaniciAdi || '?').substring(0, 8)}</span>
              </button>
            );
          })}
          {durumlar.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 8px' }}>
              Henüz durum paylaşılmamış
            </p>
          )}
        </div>
      </div>

      {/* Sağ: seçili durumu göster */}
      {seciliDurum ? (
        <div className={s.durumGoruntule}>
          <div
            className={s.durumKart}
            style={seciliDurum.tip === 'metin' ? { background: seciliDurum.arkaplanRenk || '#E8621A' } : {}}
          >
            {renderDurumIcerik(seciliDurum)}
            <div className={s.durumMeta}>
              <span className={s.durumSahibi}>
                {seciliDurum.kullanici?.goruntulenenAd || 'Bilinmeyen'}
              </span>
              <span className={s.durumTarih}>
                {formatTarih(seciliDurum.olusturulmaTarihi || seciliDurum.createdAt)}
              </span>
              {(seciliDurum.kullanici?._id === kullanici?.id || seciliDurum.kullanici?.id === kullanici?.id) && (
                <>
                  <button className={s.goruluyorBtn} onClick={() => goruluyorAc(seciliDurum)}>
                    👁️ {seciliDurum.gorenler?.length || 0}
                  </button>
                  <button className={s.silBtn} onClick={() => durumSil(seciliDurum._id)}>🗑️</button>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setSeciliDurum(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}
          >✕</button>
        </div>
      ) : (
        <div className={s.bos}>
          <span style={{ fontSize: 56 }}>🎭</span>
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Bir duruma tıkla veya yeni durum oluştur</p>
        </div>
      )}

      {/* Görülenler modal */}
      {goruluyorModal && (
        <div className={s.modal} onClick={() => setGoruluyorModal(null)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)' }}>Görenler ({goruluyorListesi.length})</h3>
              <button onClick={() => setGoruluyorModal(null)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
            </div>
            {goruluyorListesi.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Henüz kimse görmemiş</p>
            )}
            {goruluyorListesi.map((k: any) => (
              <div key={k._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                {k.avatar
                  ? <img src={k.avatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{(k.goruntulenenAd || '?')[0]}</div>
                }
                <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{k.goruntulenenAd}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
