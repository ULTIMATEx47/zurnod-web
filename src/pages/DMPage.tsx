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
  const kullanici = useSelector((st: RootState) => st.app.kullanici);
  const dmler = useSelector((st: RootState) => st.app.dmler);
  const secilenDM = useSelector((st: RootState) => st.app.secilenDM);
  const mesajlar = useSelector((st: RootState) => st.app.dmMesajlari);
  const cevrimiciKullanicilar = useSelector((st: RootState) => st.app.cevrimiciKullanicilar);

  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [profilKisi, setProfilKisi] = useState<any>(null);
  const [duzenlemeModu, setDuzenlemeModu] = useState<{ id: string; icerik: string } | null>(null);
  const [cevapVerilen, setCevapVerilen] = useState<any>(null);
  const [arkadas, setArkadas] = useState('');
  const [arkDmYukleniyor, setArkDmYukleniyor] = useState(false);
  const [silOnay, setSilOnay] = useState<string | null>(null); // dmId bekliyor
  const altRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentDmId = useRef<string | undefined>(dmId);

  useEffect(() => { currentDmId.current = dmId; }, [dmId]);
  useEffect(() => { dispatch(dmleriGetirThunk()); }, []);

  useEffect(() => {
    if (dmId) {
      const dm = dmler.find(d => d._id === dmId);
      if (dm) {
        dispatch(setSecilenDM(dm));
        dispatch(dmMesajlariGetirThunk(dmId));
      } else if (dmler.length > 0) {
        dispatch(dmleriGetirThunk());
      }
    } else {
      dispatch(setSecilenDM(null));
    }
  }, [dmId, dmler.length]);

  // Socket: yeni_dm_mesaji
  useEffect(() => {
    const socket = socketAl();
    if (!socket) return;
    const handler = (data: any) => {
      const mesaj = data.mesaj || data;
      const mesajDmId = mesaj.dm || data.dmId;
      if (mesajDmId === currentDmId.current) dispatch(dmMesajEkle(mesaj));
      dispatch(dmleriGetirThunk());
    };
    socket.on('yeni_dm_mesaji', handler);
    socket.on('yeni_dm_mesaj', handler);
    return () => { socket.off('yeni_dm_mesaji', handler); socket.off('yeni_dm_mesaj', handler); };
  }, []);

  useEffect(() => { altRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mesajlar]);

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

  const gorselSec = () => {
    if (!dmId) return;
    const localDmId = dmId;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      // Dosya boyutu kontrol (max 10MB)
      if (file.size > 10 * 1024 * 1024) { alert('Dosya 10MB den buyuk olamaz'); return; }
      setYukleniyor(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel';
          // Backend'e dmId ile gonder - hem yukler hem socket emit eder
          await api.gorselDmGonder(localDmId, base64, tip as 'gorsel' | 'video');
        } catch (err: any) {
          console.error('Gorsel yuklenemedi:', err);
          alert('Medya gonderilemedi: ' + (err.message || 'Bilinmeyen hata'));
        }
        finally { setYukleniyor(false); }
      };
      reader.onerror = () => { setYukleniyor(false); alert('Dosya okunamadi'); };
      reader.readAsDataURL(file);
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
      } else { alert('Kullanici bulunamadi'); }
    } catch (err) { console.error(err); }
    finally { setArkDmYukleniyor(false); }
  };

  const dmSilOnayla = async (id: string) => {
    try {
      await api.dmSil(id);
      dispatch(dmleriGetirThunk());
      if (dmId === id) navigate('/dm');
    } catch (e: any) { alert('Silinemedi: ' + e.message); }
    finally { setSilOnay(null); }
  };

  const isOnline = (kisi: any) => {
    if (!kisi) return false;
    return cevrimiciKullanicilar.includes(kisi._id || kisi.id);
  };

  const renderDmIcerik = (dm: any) => {
    if (!dm.sonMesaj) return '';
    const ic = dm.sonMesaj.icerik || '';
    if (ic.startsWith('http') && ic.match(/\.(jpg|jpeg|png|gif|webp|mp4)/i)) return 'Medya';
    if (ic.length > 35) return ic.substring(0, 35) + '...';
    return ic;
  };

  const chatAcik = !!dmId;

  return (
    <div className={s.container}>
      {/* Sol Panel */}
      <div className={`${s.panel} ${chatAcik ? s.hidden : ''}`}>
        <div className={s.panelHeader}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Mesajlar</span>
        </div>
        <div className={s.newDm}>
          <input
            className={s.newDmInput}
            placeholder="Kullanici adi ara..."
            value={arkadas}
            onChange={e => setArkadas(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && dmAc()}
          />
          <button className={s.newDmBtn} onClick={dmAc} disabled={arkDmYukleniyor} title="Mesaj Baslat">+</button>
        </div>
        <div className={s.dmList}>
          {dmler.map(dm => {
            const diger = dm.katilimcilar?.find(k => k._id !== kullanici?.id && k.id !== kullanici?.id);
            const aktif = isOnline(diger);
            const gosterAd = diger?.goruntulenenAd || diger?.kullaniciAdi;
            return (
              <div key={dm._id} className={s.dmItemWrap}>
                <button
                  className={`${s.dmItem} ${dmId === dm._id ? s.dmItemActive : ''}`}
                  onClick={() => navigate(`/dm/${dm._id}`)}
                >
                  <div className={s.dmAvatar}>
                    {diger?.avatar
                      ? <img src={diger.avatar} alt="" className={s.avatarImg} />
                      : <span>{(gosterAd || '?')[0].toUpperCase()}</span>
                    }
                    <span className={`${s.statusDot} ${aktif ? s.dotOnline : s.dotOffline}`} />
                  </div>
                  <div className={s.dmInfo}>
                    <span className={s.dmAd}>{gosterAd || 'Bilinmeyen'}</span>
                    {dm.sonMesaj && <span className={s.dmSon}>{renderDmIcerik(dm)}</span>}
                  </div>
                </button>
                {/* Silme butonu */}
                {silOnay === dm._id ? (
                  <div className={s.silOnayRow}>
                    <span className={s.silOnayText}>Sil?</span>
                    <button className={s.silOnayEvet} onClick={() => dmSilOnayla(dm._id)}>Evet</button>
                    <button className={s.silOnayHayir} onClick={() => setSilOnay(null)}>Hayir</button>
                  </div>
                ) : (
                  <button className={s.dmSilBtn} onClick={() => setSilOnay(dm._id)} title="DM'yi sil">🗑</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sohbet */}
      {secilenDM && karsiKisi ? (
        <div className={`${s.chat} ${chatAcik ? s.visible : ''}`}>
          <div className={s.chatHeader}>
            <button className={s.backBtn} onClick={() => navigate('/dm')} title="Geri">&#8592;</button>
            <button className={s.avatarBtn} onClick={() => setProfilKisi(karsiKisi)}>
              {karsiKisi.avatar
                ? <img src={karsiKisi.avatar} alt="" className={s.headerAvatar} />
                : <span className={s.headerAvatarPlaceholder}>{(karsiKisi.goruntulenenAd || karsiKisi.kullaniciAdi || '?')[0].toUpperCase()}</span>
              }
              <span className={`${s.statusDot2} ${isOnline(karsiKisi) ? s.dotOnline : s.dotOffline}`} />
            </button>
            <div>
              <div className={s.headerAd}>{karsiKisi.goruntulenenAd || karsiKisi.kullaniciAdi}</div>
              <div className={s.headerDurum}>{isOnline(karsiKisi) ? 'Cevrimici' : 'Cevrimdisi'}</div>
            </div>
          </div>

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
                onSil={() => api.socketMesajSil(mesaj._id)}
                cevapVerilen={mesaj.cevapVerilen}
              />
            ))}
            <div ref={altRef} />
          </div>

          {cevapVerilen && (
            <div className={s.cevapBar}>
              <span>Yanitla: <b>{cevapVerilen.yazar?.goruntulenenAd}</b>: {cevapVerilen.icerik?.substring(0, 60)}</span>
              <button onClick={() => setCevapVerilen(null)} className={s.cevapKapat}>x</button>
            </div>
          )}
          {duzenlemeModu && (
            <div className={s.cevapBar}>
              <span>Mesaj duzenleniyor</span>
              <button onClick={() => { setDuzenlemeModu(null); setMetin(''); }} className={s.cevapKapat}>x</button>
            </div>
          )}

          <div className={s.inputArea}>
            <button className={s.mediaBtn} onClick={gorselSec} disabled={yukleniyor} title="Medya gonder">
              {yukleniyor ? '...' : '📎'}
            </button>
            <input
              ref={inputRef}
              className={s.input}
              placeholder={`@${karsiKisi.kullaniciAdi || karsiKisi.goruntulenenAd} adli kisiye mesaj gonder`}
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
          <h2 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Mesajlarini sec</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Bir konusma sec veya yeni bir tane baslat</p>
        </div>
      )}

      {profilKisi && <ProfilModal kisi={profilKisi} onKapat={() => setProfilKisi(null)} />}
    </div>
  );
}
