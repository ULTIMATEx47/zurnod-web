import React, { useState } from 'react';
import * as api from '../utils/api';
import s from './AramaPage.module.css';
import ProfilModal from '../components/ProfilModal';

export default function AramaPage() {
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [profilKisi, setProfilKisi] = useState<any>(null);

  const ara = async () => {
    if (!sorgu.trim()) return;
    setYukleniyor(true);
    try {
      const r = await api.kullanicilariAra(sorgu.trim());
      setSonuclar(r || []);
    } catch {} finally { setYukleniyor(false); }
  };

  return (
    <div className={s.container}>
      <div className={s.inner}>
        <h2 className={s.baslik}>🔍 Kullanıcı Ara</h2>
        <div className={s.aramaRow}>
          <input
            className={s.input}
            placeholder="Kullanıcı adı veya isim ara..."
            value={sorgu}
            onChange={e => setSorgu(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ara()}
          />
          <button className={s.araBtn} onClick={ara} disabled={yukleniyor}>
            {yukleniyor ? '...' : '🔍 Ara'}
          </button>
        </div>
        <div className={s.sonuclar}>
          {sonuclar.length === 0 && sorgu && !yukleniyor && (
            <p className={s.bos}>Sonuç bulunamadı</p>
          )}
          {sonuclar.map(k => (
            <div key={k._id} className={s.kullanici}>
              <button className={s.avatarBtn} onClick={() => setProfilKisi(k)}>
                {k.avatar
                  ? <img src={k.avatar} alt="" className={s.avatar} />
                  : <div className={s.avatarPlaceholder}>{(k.goruntulenenAd || '?')[0].toUpperCase()}</div>
                }
              </button>
              <div className={s.bilgi}>
                <span className={s.ad}>{k.goruntulenenAd}</span>
                <span className={s.kullaniciAdi}>@{k.kullaniciAdi}</span>
              </div>
              <div className={s.butonlar}>
                <button className={s.profilBtn} onClick={() => setProfilKisi(k)}>Profil</button>
                <button className={s.mesajBtn} onClick={async () => {
                  const dm = await api.dmAc(k._id);
                  window.location.href = `/dm/${dm._id}`;
                }}>💬 Mesaj</button>
                <button className={s.istekBtn} onClick={async () => {
                  await api.arkadaslikIstegiGonder(k.kullaniciAdi);
                  alert('İstek gönderildi!');
                }}>👥 Arkadaş Ekle</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {profilKisi && <ProfilModal kisi={profilKisi} onKapat={() => setProfilKisi(null)} />}
    </div>
  );
}
