import React, { useEffect, useState } from 'react';
import * as api from '../utils/api';
import s from './AdminPaneli.module.css';

export default function AdminPaneli() {
  const [kodlar, setKodlar] = useState<any[]>([]);
  const [adet, setAdet] = useState(1);
  const [gun, setGun] = useState(30);
  const [uretilen, setUretilen] = useState<string[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kullanicilar, setKullanicilar] = useState<any[]>([]);
  const [sekme, setSekme] = useState<'kodlar' | 'kullanicilar'>('kodlar');

  useEffect(() => { fetchKodlar(); fetchKullanicilar(); }, []);

  const fetchKodlar = async () => {
    try { const k = await api.adminPremiumKodlariGetir(); setKodlar(k || []); } catch {}
  };

  const fetchKullanicilar = async () => {
    try { const k = await api.adminKullanicilariGetir(); setKullanicilar(k || []); } catch {}
  };

  const kodOlustur = async () => {
    setYukleniyor(true);
    try {
      const sonuc = await api.adminPremiumKodOlustur(adet, gun);
      setUretilen(sonuc.kodlar || []);
      fetchKodlar();
    } catch (e: any) { alert(e.message); }
    finally { setYukleniyor(false); }
  };

  const kodSil = async (id: string) => {
    if (!confirm('Bu kodu kalıcı olarak silmek istiyor musun?')) return;
    try { await api.adminPremiumKodSil(id); fetchKodlar(); } catch (e: any) { alert(e.message); }
  };

  const kopya = (metin: string) => { navigator.clipboard.writeText(metin); };

  const durumLabel = (k: any) => {
    if (k.iptalEdildi) return { text: '🚫 İptal', renk: '#F04747' };
    if (k.kullananKullanici) return { text: '✅ Kullanıldı', renk: '#43B581' };
    const bitis = new Date(k.sonKullanmaTarihi);
    if (bitis < new Date()) return { text: '⚠️ Süresi Doldu', renk: '#FAA61A' };
    return { text: '🟢 Aktif', renk: '#43B581' };
  };

  return (
    <div className={s.container}>
      {/* Sekme */}
      <div className={s.sekmeler}>
        <button className={`${s.sekme} ${sekme === 'kodlar' ? s.sekmeAktif : ''}`} onClick={() => setSekme('kodlar')}>Premium Kodlar</button>
        <button className={`${s.sekme} ${sekme === 'kullanicilar' ? s.sekmeAktif : ''}`} onClick={() => setSekme('kullanicilar')}>Kullanıcılar ({kullanicilar.length})</button>
      </div>

      {sekme === 'kodlar' && (
        <>
          {/* Kod oluştur */}
          <div className={s.olusturForm}>
            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>ADET</label>
                <input type="number" className={s.input} value={adet} min={1} max={50} onChange={e => setAdet(Number(e.target.value))} />
              </div>
              <div className={s.field}>
                <label className={s.label}>GEÇERLİLİK (GÜN)</label>
                <input type="number" className={s.input} value={gun} min={1} max={365} onChange={e => setGun(Number(e.target.value))} />
              </div>
              <button className={s.olusturBtn} onClick={kodOlustur} disabled={yukleniyor}>
                {yukleniyor ? '...' : `${adet} Kod Oluştur`}
              </button>
            </div>
          </div>

          {/* Üretilen kodlar */}
          {uretilen.length > 0 && (
            <div className={s.uretilenler}>
              <div className={s.uretilenHeader}>
                <span className={s.uretilenBaslik}>Üretilen Kodlar ({uretilen.length})</span>
                <button className={s.hepsiniKopyaBtn} onClick={() => kopya(uretilen.join('\n'))}>📋 Hepsini Kopyala</button>
              </div>
              {uretilen.map(k => (
                <div key={k} className={s.uretilenKod} onClick={() => kopya(k)} title="Kopyala">
                  <span className={s.kodMetin}>{k}</span>
                  <span className={s.kopya}>📋</span>
                </div>
              ))}
            </div>
          )}

          {/* Kod listesi */}
          <div className={s.kodListesi}>
            {kodlar.map(k => {
              const durum = durumLabel(k);
              const bitis = new Date(k.sonKullanmaTarihi);
              const suresiDoldu = bitis < new Date();
              return (
                <div key={k._id} className={`${s.kodItem} ${suresiDoldu ? s.kodSuresiDoldu : ''}`}>
                  <span className={s.kodItemMetin} onClick={() => kopya(k.kod)} title="Kopyala">
                    {k.kod} 📋
                  </span>
                  <span className={s.kodDurum} style={{ color: durum.renk }}>{durum.text}</span>
                  {k.kullananKullanici && (
                    <span className={s.kullanan}>@{k.kullananKullanici?.kullaniciAdi || 'Kullanıcı'}</span>
                  )}
                  <span className={s.bitis}>📅 {bitis.toLocaleDateString('tr-TR')}</span>
                  {(k.iptalEdildi || k.kullananKullanici || suresiDoldu) && (
                    <button className={s.silBtn} onClick={() => kodSil(k._id)} title="Kalıcı Sil">🗑️</button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {sekme === 'kullanicilar' && (
        <div className={s.kullaniciListesi}>
          {kullanicilar.map(k => (
            <div key={k._id} className={s.kullaniciItem}>
              <div className={s.kullaniciAvatar}>
                {k.avatar ? <img src={k.avatar} alt="" className={s.kullaniciAvatarImg} /> : (k.goruntulenenAd || '?')[0]}
              </div>
              <div className={s.kullaniciBilgi}>
                <span className={s.kullaniciAd}>{k.goruntulenenAd}</span>
                <span className={s.kullaniciDetay}>@{k.kullaniciAdi} {k.isPremium ? '⭐' : ''} {k.isAdmin ? '🛡️' : ''}</span>
              </div>
              <button className={s.kullaniciSilBtn} onClick={async () => {
                if (confirm(`@${k.kullaniciAdi} silinsin mi?`)) {
                  await api.adminKullaniciSil(k._id);
                  fetchKullanicilar();
                }
              }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
