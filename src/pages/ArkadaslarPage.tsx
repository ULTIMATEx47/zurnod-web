import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, arkadaslariGetirThunk } from '../store';
import * as api from '../utils/api';
import s from './ArkadaslarPage.module.css';
import ProfilModal from '../components/ProfilModal';

type Sekme = 'arkadaslar' | 'bekleyen' | 'gonderilen' | 'engellenenler';

export default function ArkadaslarPage() {
  const dispatch = useDispatch<AppDispatch>();
  const arkadaslar = useSelector((s: RootState) => s.app.arkadaslar);
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const cevrimici = useSelector((s: RootState) => s.app.cevrimiciKullanicilar);

  const [sekme, setSekme] = useState<Sekme>('arkadaslar');
  const [bekleyen, setBekleyen] = useState<any[]>([]);
  const [gonderilen, setGonderilen] = useState<any[]>([]);
  const [engellenenler, setEngellenenler] = useState<any[]>([]);
  const [istek, setIstek] = useState('');
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [profilKisi, setProfilKisi] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    dispatch(arkadaslariGetirThunk());
    fetchBekleyen();
  }, []);

  const fetchBekleyen = async () => {
    try {
      const b = await api.istek('GET', '/api/arkadaslar/bekleyen');
      setBekleyen(b || []);
      const g = await api.istek('GET', '/api/arkadaslar/gonderilen-istekler').catch(() => []);
      setGonderilen(g || []);
    } catch {}
  };

  const istekGonder = async () => {
    if (!istek.trim()) return;
    setHata(''); setBasari(''); setYukleniyor(true);
    try {
      await api.arkadaslikIstegiGonder(istek.trim());
      setBasari(`@${istek} kullanıcısına istek gönderildi`);
      setIstek('');
      fetchBekleyen();
    } catch (e: any) {
      setHata(e.message || 'İstek gönderilemedi');
    } finally { setYukleniyor(false); }
  };

  const kabul = async (id: string) => {
    await api.arkadaslikIstegiKabul(id);
    dispatch(arkadaslariGetirThunk());
    fetchBekleyen();
  };

  const reddet = async (id: string) => {
    await api.arkadaslikIstegiReddet(id);
    fetchBekleyen();
  };

  const sil = async (id: string) => {
    if (!confirm('Arkadaşı silmek istediğine emin misin?')) return;
    await api.arkadasSil(id);
    dispatch(arkadaslariGetirThunk());
  };

  const isOnline = (k: any) => cevrimici.includes(k?._id || k?.id);

  const durumRengi = (k: any) => isOnline(k) ? '#43B581' : '#747F8D';

  const renderArkadaslar = () => arkadaslar.map((a: any) => {
    const k = a.kullanici || a.arkadaslik || a;
    if (!k || k._id === kullanici?.id) return null;
    return (
      <div key={a._id || a.id} className={s.item}>
        <button className={s.avatarBtn} onClick={() => setProfilKisi(k)}>
          <div className={s.avatarWrap}>
            {k.avatar
              ? <img src={k.avatar} alt="" className={s.avatar} />
              : <div className={s.avatarPlaceholder}>{(k.goruntulenenAd || '?')[0].toUpperCase()}</div>
            }
            <span className={s.dot} style={{ background: durumRengi(k) }} />
          </div>
        </button>
        <div className={s.bilgi}>
          <span className={s.ad}>{k.goruntulenenAd || k.kullaniciAdi}</span>
          <span className={s.durum} style={{ color: durumRengi(k) }}>
            {isOnline(k) ? '● Çevrimiçi' : '● Çevrimdışı'}
          </span>
        </div>
        <div className={s.butonlar}>
          <button className={s.mesajBtn} onClick={async () => {
            const dm = await api.dmAc(k._id || k.id);
            window.location.href = `/dm/${dm._id}`;
          }}>💬</button>
          <button className={s.silBtn} onClick={() => sil(a._id || a.id)}>🗑️</button>
        </div>
      </div>
    );
  });

  const renderBekleyen = () => bekleyen.map((istek: any) => {
    const k = istek.gonderen || istek;
    return (
      <div key={istek._id} className={s.item}>
        <div className={s.avatarWrap}>
          {k.avatar
            ? <img src={k.avatar} alt="" className={s.avatar} />
            : <div className={s.avatarPlaceholder}>{(k.goruntulenenAd || '?')[0].toUpperCase()}</div>
          }
        </div>
        <div className={s.bilgi}>
          <span className={s.ad}>{k.goruntulenenAd || k.kullaniciAdi}</span>
          <span className={s.altBilgi}>@{k.kullaniciAdi} • Bekliyor</span>
        </div>
        <div className={s.butonlar}>
          <button className={s.kabulBtn} onClick={() => kabul(istek._id)}>✓</button>
          <button className={s.silBtn} onClick={() => reddet(istek._id)}>✗</button>
        </div>
      </div>
    );
  });

  return (
    <div className={s.container}>
      <div className={s.panel}>
        <div className={s.header}>
          <h2 className={s.baslik}>Arkadaşlar</h2>
        </div>

        {/* Sekme menü */}
        <div className={s.sekmeler}>
          {([['arkadaslar', '👥 Hepsi'], ['bekleyen', `⏳ Bekleyen ${bekleyen.length > 0 ? `(${bekleyen.length})` : ''}`], ['gonderilen', '📤 Gönderilen'], ['engellenenler', '🚫 Engellenenler']] as const).map(([id, label]) => (
            <button
              key={id}
              className={`${s.sekme} ${sekme === id ? s.sekmeAktif : ''}`}
              onClick={() => setSekme(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* İstek ekle */}
        <div className={s.istekEkle}>
          <input
            className={s.istekInput}
            placeholder="Kullanıcı adı ile arkadaş ekle..."
            value={istek}
            onChange={e => setIstek(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && istekGonder()}
          />
          <button className={s.istekBtn} onClick={istekGonder} disabled={yukleniyor}>
            {yukleniyor ? '...' : 'İstek Gönder'}
          </button>
        </div>
        {hata && <p className={s.hata}>{hata}</p>}
        {basari && <p className={s.basari}>{basari}</p>}

        {/* Liste */}
        <div className={s.liste}>
          {sekme === 'arkadaslar' && (
            arkadaslar.length === 0
              ? <p className={s.bos}>Henüz arkadaşın yok</p>
              : renderArkadaslar()
          )}
          {sekme === 'bekleyen' && (
            bekleyen.length === 0
              ? <p className={s.bos}>Bekleyen istek yok</p>
              : renderBekleyen()
          )}
          {sekme === 'gonderilen' && (
            gonderilen.length === 0
              ? <p className={s.bos}>Gönderilmiş istek yok</p>
              : gonderilen.map((i: any) => {
                const k = i.alan || i;
                return (
                  <div key={i._id} className={s.item}>
                    <div className={s.avatarWrap}>
                      {k.avatar ? <img src={k.avatar} alt="" className={s.avatar} /> : <div className={s.avatarPlaceholder}>{(k.goruntulenenAd || '?')[0].toUpperCase()}</div>}
                    </div>
                    <div className={s.bilgi}>
                      <span className={s.ad}>{k.goruntulenenAd}</span>
                      <span className={s.altBilgi}>Yanıt bekleniyor</span>
                    </div>
                  </div>
                );
              })
          )}
          {sekme === 'engellenenler' && <p className={s.bos}>Engellenen kullanıcı yok</p>}
        </div>
      </div>

      {profilKisi && <ProfilModal kisi={profilKisi} onKapat={() => setProfilKisi(null)} />}
    </div>
  );
}
