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
  if (fark < 60000) return 'Az once';
  if (fark < 3600000) return `${Math.floor(fark / 60000)} dk once`;
  if (d.toDateString() === simdi.toDateString())
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function DurumPage() {
  const kullanici = useSelector((st: RootState) => st.app.kullanici);
  // Backend: [{ yazar: {...}, durumlar: [...], hepsiniGordumMu: bool }]
  const [gruplar, setGruplar] = useState<any[]>([]);
  const [seciliGrup, setSeciliGrup] = useState<any>(null); // { yazar, durumlar }
  const [seciliDurumIdx, setSeciliDurumIdx] = useState(0);
  const [yeniDurumText, setYeniDurumText] = useState('');
  const [yeniDurumRenk, setYeniDurumRenk] = useState('#E8621A');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [goruluyorModal, setGoruluyorModal] = useState<any>(null);
  const [goruluyorListesi, setGoruluyorListesi] = useState<any[]>([]);

  useEffect(() => { fetchDurumlar(); }, []);

  const fetchDurumlar = async () => {
    try {
      const d = await api.durumlariGetir();
      // d = [{ yazar, durumlar, hepsiniGordumMu }]
      setGruplar(Array.isArray(d) ? d : []);
    } catch (e) { console.error('durumlar alinamadi:', e); }
  };

  const gorselYukle = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      setYukleniyor(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const url = await api.gorselYukle(base64);
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel';
          await api.durumPaylas(tip, url, yeniDurumRenk);
          fetchDurumlar();
        } catch (err) { console.error(err); }
        finally { setYukleniyor(false); }
      };
      reader.onerror = () => setYukleniyor(false);
      reader.readAsDataURL(file);
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
    } catch (e) { console.error(e); }
    finally { setYukleniyor(false); }
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
      setSeciliGrup(null);
    } catch {}
  };

  const grupAc = async (grup: any) => {
    setSeciliGrup(grup);
    setSeciliDurumIdx(0);
    // Ilk durumu goruldu olarak isaretle
    if (grup.durumlar?.[0]?._id) {
      try { await api.durumGor(grup.durumlar[0]._id); } catch {}
    }
  };

  const RENKLER = ['#E8621A', '#F5A623', '#43B581', '#5865F2', '#ED4245', '#FAA61A', '#1ABC9C', '#9B59B6'];

  const seciliDurum = seciliGrup?.durumlar?.[seciliDurumIdx] || null;
  const benimGrupId = kullanici?.id || kullanici?._id;

  const renderDurumIcerik = (d: any) => {
    if (!d) return null;
    const tip = d.tip || 'metin';
    if (tip === 'gorsel' || (d.icerik?.match && d.icerik.match(/\.(jpg|jpeg|png|gif|webp)/i))) {
      return <img src={d.icerik} alt="durum" className={s.durumGorsel} />;
    }
    if (tip === 'video' || (d.icerik?.match && d.icerik.match(/\.(mp4|webm|mov)/i))) {
      return <video src={d.icerik} controls className={s.durumVideo} />;
    }
    // Metin durumu
    return (
      <div className={s.durumMetinKart} style={{ background: d.arkaplanRenk || '#E8621A' }}>
        <p className={s.durumMetin}>{d.icerik}</p>
      </div>
    );
  };

  return (
    <div className={s.container}>
      {/* Sol: durum olustur + liste */}
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
            <button className={s.mediaBtn} onClick={gorselYukle} title="Fotograf/Video">📷</button>
            <button className={s.gonderBtn} onClick={metinDurumGonder} disabled={!yeniDurumText.trim() || yukleniyor}>
              {yukleniyor ? '...' : '➤'}
            </button>
          </div>
        </div>

        {/* Durum cevresi listesi */}
        <div className={s.durumCemberleri}>
          {gruplar.map((grup) => {
            const yazar = grup.yazar;
            if (!yazar) return null;
            const yazarId = yazar._id || yazar.id;
            const benimMi = yazarId === benimGrupId;
            const goruldu = grup.hepsiniGordumMu;
            return (
              <button key={yazarId} className={`${s.durumCember} ${benimMi ? s.benimDurum : ''}`}
                onClick={() => grupAc(grup)}>
                <div className={s.cemberAvatar} style={{ borderColor: goruldu ? 'var(--text-muted)' : (benimMi ? '#E8621A' : '#F5A623') }}>
                  {yazar.avatar
                    ? <img src={yazar.avatar} alt="" className={s.cemberImg} />
                    : <div className={s.cemberPlaceholder}>{(yazar.goruntulenenAd || yazar.kullaniciAdi || '?')[0].toUpperCase()}</div>
                  }
                </div>
                <span className={s.cemberAd}>{benimMi ? 'Sen' : (yazar.goruntulenenAd || yazar.kullaniciAdi || '?').substring(0, 8)}</span>
              </button>
            );
          })}
          {gruplar.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 8px' }}>
              Hic durum paylasilmamis
            </p>
          )}
        </div>
      </div>

      {/* Sag: secili durumu goster */}
      {seciliGrup && seciliDurum ? (
        <div className={s.durumGoruntule}>
          {/* Birden fazla durum varsa ilerleme cubugu */}
          {seciliGrup.durumlar.length > 1 && (
            <div className={s.ilerlemeBar}>
              {seciliGrup.durumlar.map((_: any, i: number) => (
                <button
                  key={i}
                  className={`${s.ilerlemeDilim} ${i === seciliDurumIdx ? s.ilerlemeDilimAktif : i < seciliDurumIdx ? s.ilerlemeDilimGecti : ''}`}
                  onClick={() => setSeciliDurumIdx(i)}
                />
              ))}
            </div>
          )}

          <div className={s.durumKart}>
            {renderDurumIcerik(seciliDurum)}
            <div className={s.durumMeta}>
              <div className={s.durumSahibiRow}>
                {seciliGrup.yazar?.avatar
                  ? <img src={seciliGrup.yazar.avatar} alt="" className={s.durumSahibiAvatar} />
                  : <div className={s.durumSahibiAvatarPlaceholder}>{(seciliGrup.yazar?.goruntulenenAd || '?')[0].toUpperCase()}</div>
                }
                <div>
                  <span className={s.durumSahibi}>{seciliGrup.yazar?.goruntulenenAd || seciliGrup.yazar?.kullaniciAdi || 'Bilinmeyen'}</span>
                  <span className={s.durumTarih}>{formatTarih(seciliDurum.olusturulmaTarihi || seciliDurum.createdAt)}</span>
                </div>
              </div>
              {(seciliGrup.yazar?._id === benimGrupId || seciliGrup.yazar?.id === benimGrupId) && (
                <div className={s.durumAksiyonlar}>
                  <button className={s.goruluyorBtn} onClick={() => goruluyorAc(seciliDurum)}>
                    👁 {seciliDurum.gorenler?.length || 0}
                  </button>
                  <button className={s.silBtn} onClick={() => durumSil(seciliDurum._id)}>🗑️</button>
                </div>
              )}
            </div>
          </div>

          {/* Onceki/Sonraki durum */}
          {seciliGrup.durumlar.length > 1 && (
            <div className={s.durumNavRow}>
              <button className={s.durumNavBtn} disabled={seciliDurumIdx === 0}
                onClick={() => setSeciliDurumIdx(i => i - 1)}>←</button>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {seciliDurumIdx + 1} / {seciliGrup.durumlar.length}
              </span>
              <button className={s.durumNavBtn} disabled={seciliDurumIdx === seciliGrup.durumlar.length - 1}
                onClick={() => setSeciliDurumIdx(i => i + 1)}>→</button>
            </div>
          )}

          <button
            onClick={() => setSeciliGrup(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: 34, height: 34, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >x</button>
        </div>
      ) : (
        <div className={s.bos}>
          <span style={{ fontSize: 56 }}>🎭</span>
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Bir duruma tikla veya yeni durum olustur</p>
        </div>
      )}

      {/* Gorulenler modal */}
      {goruluyorModal && (
        <div className={s.modal} onClick={() => setGoruluyorModal(null)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)' }}>Gorenler ({goruluyorListesi.length})</h3>
              <button onClick={() => setGoruluyorModal(null)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 18 }}>x</button>
            </div>
            {goruluyorListesi.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Henic kimse gormemis</p>
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
