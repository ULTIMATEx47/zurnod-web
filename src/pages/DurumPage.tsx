import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as api from '../utils/api';
import s from './DurumPage.module.css';

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
      setDurumlar(d || []);
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
      setGoruluyorListesi(liste || []);
      setGoruluyorModal(durum);
    } catch {}
  };

  const durumSil = async (id: string) => {
    await api.durumSil(id);
    fetchDurumlar();
    setSeciliDurum(null);
  };

  // Durumları kişiye göre grupla
  const gruplar: { [key: string]: any[] } = {};
  durumlar.forEach(d => {
    const sahip = d.kullanici?._id || d.kullanici?.id || 'bilinmeyen';
    if (!gruplar[sahip]) gruplar[sahip] = [];
    gruplar[sahip].push(d);
  });

  const RENKLER = ['#E8621A', '#F5A623', '#43B581', '#5865F2', '#ED4245', '#FAA61A', '#1ABC9C', '#9B59B6'];

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

        {/* Durum listesi (avatar çemberleri) */}
        <div className={s.durumCemberleri}>
          {Object.entries(gruplar).map(([sahipId, durumGrubu]) => {
            const ilkDurum = durumGrubu[0];
            const kisi = ilkDurum.kullanici;
            const benimMi = sahipId === kullanici?.id || sahipId === kullanici?._id;
            return (
              <button key={sahipId} className={`${s.durumCember} ${benimMi ? s.benimDurum : ''}`}
                onClick={() => setSeciliDurum(durumGrubu)}>
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
        </div>
      </div>

      {/* Sağ: seçili durumu göster */}
      {seciliDurum && Array.isArray(seciliDurum) ? (
        <div className={s.durumGoruntule}>
          {seciliDurum.map((d: any, i: number) => {
            const benimMi = d.kullanici?._id === kullanici?.id;
            return (
              <div key={d._id} className={s.durumKart}
                style={d.tip === 'metin' ? { background: d.arkaplanRenk || '#E8621A' } : {}}>
                {d.tip === 'gorsel' && <img src={d.icerik} alt="" className={s.durumGorsel} />}
                {d.tip === 'video' && <video src={d.icerik} controls className={s.durumVideo} />}
                {d.tip === 'metin' && <p className={s.durumMetin}>{d.icerik}</p>}
                <div className={s.durumMeta}>
                  <span className={s.durumTarih}>{new Date(d.olusturulmaTarihi).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {benimMi && (
                    <>
                      <button className={s.goruluyorBtn} onClick={() => goruluyorAc(d)}>
                        👁️ {d.gorenler?.length || 0}
                      </button>
                      <button className={s.silBtn} onClick={() => durumSil(d._id)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
            {goruluyorListesi.map((k: any) => (
              <div key={k._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                {k.avatar ? <img src={k.avatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>{(k.goruntulenenAd || '?')[0]}</div>}
                <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{k.goruntulenenAd}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
