import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, dmleriGetirThunk, dmMesajlariGetirThunk, setSecilenDM, dmMesajEkle, dmGuncelleRedux } from '../store';
import * as api from '../utils/api';
import { socketAl } from '../utils/api';
import s from './DMPage.module.css';
import ProfilModal from '../components/ProfilModal';
import MesajItem from '../components/MesajItem';

export default function DMPage() {
  const { dmId } = useParams<{ dmId?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const dmler = useSelector((s: RootState) => s.app.dmler);
  const secilenDM = useSelector((s: RootState) => s.app.secilenDM);
  const mesajlar = useSelector((s: RootState) => s.app.dmMesajlari);
  const cevrimiciKullanicilar = useSelector((s: RootState) => s.app.cevrimiciKullanicilar);

  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [profilKisi, setProfilKisi] = useState<any>(null);
  const [duzenlemeModu, setDuzenlemeModu] = useState<{ id: string; icerik: string } | null>(null);
  const [cevapVerilen, setCevapVerilen] = useState<any>(null);
  const [arkadas, setArkadas] = useState('');
  const [arkDmYukleniyor, setArkDmYukleniyor] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentDmId = useRef<string | undefined>(dmId);

  useEffect(() => {
    currentDmId.current = dmId;
  }, [dmId]);

  useEffect(() => {
    dispatch(dmleriGetirThunk());
  }, []);

  useEffect(() => {
    if (dmId) {
      const dm = dmler.find(d => d._id === dmId);
      if (dm) {
        dispatch(setSecilenDM(dm));
        dispatch(dmMesajlariGetirThunk(dmId));
      } else if (dmler.length > 0) {
        // DM listede yok, yenile
        dispatch(dmleriGetirThunk());
      }
    } else {
      dispatch(setSecilenDM(null));
    }
  }, [dmId, dmler.length]);

  // Socket listener - backend yeni_dm_mesaji emitiyor
  useEffect(() => {
    const socket = socketAl();
    if (!socket) return;
    const handler = (data: any) => {
      const mesaj = data.mesaj || data;
      const mesajDmId = mesaj.dm || data.dmId;
      if (mesajDmId === currentDmId.current) {
        dispatch(dmMesajEkle(mesaj));
      }
      dispatch(dmleriGetirThunk()); // DM listesini güncelle
    };
    socket.on('yeni_dm_mesaji', handler);
    socket.on('yeni_dm_mesaj', handler); // fallback
    return () => {
      socket.off('yeni_dm_mesaji', handler);
      socket.off('yeni_dm_mesaj', handler);
    };
  }, []);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  const karsiKisi = secilenDM?.katilimcilar?.find(k => k._id !== kullanici?.id && k.id !== kullanici?.id);

  const gonder = () => {
    if (!metin.trim() || !dmId) return;
    const icerik = metin.trim();
    setMetin('');
    if (duzenlemeModu) {
      api.socketMesajDuzenle(duzenlemeModu.id, icerik);
      setDuzenlemeModu(null);
    } else {
      api.socketDmGonder(dmId, icerik, 'metin', cevapVerilen?._id);
      setCevapVerilen(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(); }
  };

  const gorselSec = async () => {
    if (!dmId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setYukleniyor(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          const url = await api.gorselYukle(base64);
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel';
          api.socketDmGonder(dmId, url, tip);
        };
        reader.readAsDataURL(file);
      } catch (err) { console.error(err); }
      finally { setYukleniyor(false); }
    };
    input.click();
  };

  const dmAc = async () => {
    if (!arkadas.trim()) return;
    setArkDmYukleniyor(true);
    try {
      const sonuc = await api.kullanicilariAra(arkadas);
      const liste = Array.isArray(sonuc) ? sonuc : (sonuc.kullanicilar || []);
      if (liste.length > 0) {
        const dm = await api.dmAc(liste[0]._id);
        dispatch(dmGuncelleRedux(dm));
        navigate(`/dm/${dm._id}`);
        setArkadas('');
      } else {
        alert('Kullanıcı bulunamadı');
      }
    } catch (err) { console.error(err); }
    finally { setArkDmYukleniyor(false); }
  };

  const isOnline = (kisi: any) => {
    if (!kisi) return false;
    return cevrimiciKullanicilar.includes(kisi._id || kisi.id);
  };

  const renderDmIcerik = (dm: any) => {
    if (!dm.sonMesaj) return '';
    const ic = dm.sonMesaj.icerik || '';
    if (ic.startsWith('http') && ic.match(/\.(jpg|jpeg|png|gif|webp|mp4)/i)) return '📷 Medya';
    if (ic.length > 35) return ic.substring(0, 35) + '...';
    return ic;
  };

  return (
    <div className={s.container}>
      {/* Sol Panel - DM listesi */}
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Mesajlar</span>
        </div>
        {/* Yeni DM aç */}
        <div className={s.newDm}>
          <input
            className={s.newDmInput}
            placeholder="Kullanıcı adı ara..."
            value={arkadas}
            onChange={e => setArkadas(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && dmAc()}
          />
          <button className={s.newDmBtn} onClick={dmAc} disabled={arkDmYukleniyor} title="Mesaj Başlat">+</button>
        </div>
        <div className={s.dmList}>
          {dmler.map(dm => {
            const diger = dm.katilimcilar?.find(k => k._id !== kullanici?.id && k.id !== kullanici?.id);
            const aktif = isOnline(diger);
            return (
              <button
                key={dm._id}
                className={`${s.dmItem} ${dmId === dm._id ? s.dmItemActive : ''}`}
                onClick={() => navigate(`/dm/${dm._id}`)}
              >
                <div className={s.dmAvatar}>
                  {diger?.avatar
                    ? <img src={diger.avatar} alt="" className={s.avatarImg} />
                    : <span>{(diger?.goruntulenenAd || diger?.kullaniciAdi || '?')[0].toUpperCase()}</span>
                  }
                  <span className={`${s.statusDot} ${aktif ? s.dotOnline : s.dotOffline}`} />
                </div>
                <div className={s.dmInfo}>
                  <span className={s.dmAd}>{diger?.goruntulenenAd || diger?.kullaniciAdi || 'Bilinmeyen'}</span>
                  {dm.sonMesaj && (
                    <span className={s.dmSon}>{renderDmIcerik(dm)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sohbet Alanı */}
      {secilenDM && karsiKisi ? (
        <div className={s.chat}>
          {/* Başlık */}
          <div className={s.chatHeader}>
            <button className={s.avatarBtn} onClick={() => setProfilKisi(karsiKisi)}>
              {karsiKisi.avatar
                ? <img src={karsiKisi.avatar} alt="" className={s.headerAvatar} />
                : <span className={s.headerAvatarPlaceholder}>{(karsiKisi.goruntulenenAd || karsiKisi.kullaniciAdi || '?')[0].toUpperCase()}</span>
              }
              <span className={`${s.statusDot2} ${isOnline(karsiKisi) ? s.dotOnline : s.dotOffline}`} />
            </button>
            <div>
              <div className={s.headerAd}>{karsiKisi.goruntulenenAd || karsiKisi.kullaniciAdi}</div>
              <div className={s.headerDurum}>{isOnline(karsiKisi) ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</div>
            </div>
          </div>

          {/* Mesajlar */}
          <div className={s.messages}>
            {mesajlar.map((mesaj, i) => (
              <MesajItem
                key={mesaj._id}
                mesaj={mesaj}
                benimMi={mesaj.yazar?._id === kullanici?.id || (mesaj.yazar as any)?.id === kullanici?.id}
                onceki={i > 0 ? mesajlar[i - 1] : null}
                onProfil={() => setProfilKisi(mesaj.yazar)}
                onCevapla={() => setCevapVerilen(mesaj)}
                onDuzenle={() => { setDuzenlemeModu({ id: mesaj._id, icerik: mesaj.icerik }); setMetin(mesaj.icerik); }}
                onSil={() => { api.socketMesajSil(mesaj._id); }}
                cevapVerilen={mesaj.cevapVerilen}
              />
            ))}
            <div ref={altRef} />
          </div>

          {/* Yanıt */}
          {cevapVerilen && (
            <div className={s.cevapBar}>
              <span>↩️ <b>{cevapVerilen.yazar?.goruntulenenAd}</b>: {cevapVerilen.icerik?.substring(0, 60)}</span>
              <button onClick={() => setCevapVerilen(null)} className={s.cevapKapat}>✕</button>
            </div>
          )}

          {/* Düzenleme */}
          {duzenlemeModu && (
            <div className={s.cevapBar}>
              <span>✏️ Mesaj düzenleniyor</span>
              <button onClick={() => { setDuzenlemeModu(null); setMetin(''); }} className={s.cevapKapat}>✕</button>
            </div>
          )}

          {/* Input */}
          <div className={s.inputArea}>
            <button className={s.mediaBtn} onClick={gorselSec} disabled={yukleniyor} title="Medya gönder">📎</button>
            <input
              ref={inputRef}
              className={s.input}
              placeholder={`@${karsiKisi.kullaniciAdi || karsiKisi.goruntulenenAd}'a mesaj gönder`}
              value={metin}
              onChange={e => setMetin(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className={s.sendBtn} onClick={gonder} disabled={!metin.trim()}>➤</button>
          </div>
        </div>
      ) : (
        <div className={s.bos}>
          <span style={{ fontSize: 64 }}>💬</span>
          <h2 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Mesajlarını seç</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Bir konuşma seç veya yeni bir tane başlat</p>
        </div>
      )}

      {profilKisi && (
        <ProfilModal kisi={profilKisi} onKapat={() => setProfilKisi(null)} />
      )}
    </div>
  );
}
