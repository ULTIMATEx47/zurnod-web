import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  useEffect(() => {
    dispatch(dmleriGetirThunk());
  }, []);

  useEffect(() => {
    if (dmId) {
      const dm = dmler.find(d => d._id === dmId);
      if (dm) {
        dispatch(setSecilenDM(dm));
        dispatch(dmMesajlariGetirThunk(dmId));
        // Socket odasına katıl
        const socket = socketAl();
        if (socket) socket.emit('dm_oda_katil', dmId);
      }
    } else {
      dispatch(setSecilenDM(null));
    }
  }, [dmId, dmler.length]);

  // Socket listeners
  useEffect(() => {
    const socket = socketAl();
    if (!socket) return;
    const handler = (data: any) => {
      const mesaj = data.mesaj || data;
      if (mesaj.dm === dmId) dispatch(dmMesajEkle(mesaj));
      if (data.dm) dispatch(dmGuncelleRedux(data.dm));
    };
    socket.on('yeni_dm_mesaj', handler);
    return () => { socket.off('yeni_dm_mesaj', handler); };
  }, [dmId]);

  // Scroll to bottom
  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  const karsiKisi = secilenDM?.katilimcilar?.find(k => k._id !== kullanici?.id && k.id !== kullanici?.id);

  const gonder = async () => {
    if (!metin.trim() || !dmId) return;
    const icerik = metin.trim();
    setMetin('');
    try {
      if (duzenlemeModu) {
        await api.istek('PUT', `/api/mesajlar/${duzenlemeModu.id}`, { icerik });
        setDuzenlemeModu(null);
      } else {
        await api.dmMesajGonder(dmId, icerik, 'metin', cevapVerilen?._id);
        setCevapVerilen(null);
      }
    } catch (err) {
      console.error(err);
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
          await api.dmMesajGonder(dmId, url, tip);
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
      // Kullanıcı ara
      const sonuc = await api.kullanicilariAra(arkadas);
      if (sonuc.length > 0) {
        const dm = await api.dmAc(sonuc[0]._id);
        dispatch(dmGuncelleRedux(dm));
        navigate(`/dm/${dm._id}`);
        setArkadas('');
      }
    } catch (err) { console.error(err); }
    finally { setArkDmYukleniyor(false); }
  };

  const durum = (kisi: any) => {
    if (!kisi) return 'offline';
    if (cevrimiciKullanicilar.includes(kisi._id || kisi.id)) return 'online';
    return 'offline';
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
          <button className={s.newDmBtn} onClick={dmAc} disabled={arkDmYukleniyor}>+</button>
        </div>
        <div className={s.dmList}>
          {dmler.map(dm => {
            const diger = dm.katilimcilar?.find(k => k._id !== kullanici?.id && k.id !== kullanici?.id);
            const aktif = durum(diger) === 'online';
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
                    <span className={s.dmSon}>
                      {dm.sonMesaj.icerik?.substring(0, 30) || '📎 Medya'}
                    </span>
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
              <span className={`${s.statusDot2} ${durum(karsiKisi) === 'online' ? s.dotOnline : s.dotOffline}`} />
            </button>
            <div>
              <div className={s.headerAd}>{karsiKisi.goruntulenenAd || karsiKisi.kullaniciAdi}</div>
              <div className={s.headerDurum}>{durum(karsiKisi) === 'online' ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</div>
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
                onSil={async () => {
                  await api.istek('DELETE', `/api/mesajlar/${mesaj._id}`);
                }}
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
              placeholder={`@${karsiKisi.kullaniciAdi}'a mesaj gönder`}
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
