import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, sunuculariGetirThunk, kanallariGetirThunk, mesajlariGetirThunk, setSecilenSunucu, setSecilenKanal, mesajEkle, mesajGuncelle, mesajSilRedux } from '../store';
import * as api from '../utils/api';
import { socketAl } from '../utils/api';
import s from './SunucularPage.module.css';
import MesajItem from '../components/MesajItem';
import ProfilModal from '../components/ProfilModal';

export default function SunucularPage() {
  const { sunucuId, kanalId } = useParams<{ sunucuId?: string; kanalId?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const sunucular = useSelector((s: RootState) => s.app.sunucular);
  const secilenSunucu = useSelector((s: RootState) => s.app.secilenSunucu);
  const kanallar = useSelector((s: RootState) => s.app.kanallar);
  const secilenKanal = useSelector((s: RootState) => s.app.secilenKanal);
  const mesajlar = useSelector((s: RootState) => s.app.mesajlar);

  const [metin, setMetin] = useState('');
  const [profilKisi, setProfilKisi] = useState<any>(null);
  const [cevapVerilen, setCevapVerilen] = useState<any>(null);
  const [duzenlemeModu, setDuzenlemeModu] = useState<{ id: string; icerik: string } | null>(null);
  const [sunucuOlusturModal, setSunucuOlusturModal] = useState(false);
  const [yeniSunucuAd, setYeniSunucuAd] = useState('');
  const [davetKod, setDavetKod] = useState('');
  const [kanalModal, setKanalModal] = useState(false);
  const [yeniKanalAd, setYeniKanalAd] = useState('');
  const [yeniKanalTip, setYeniKanalTip] = useState<'yazi' | 'ses' | 'video'>('yazi');
  const [yeniKanalKat, setYeniKanalKat] = useState('Genel');
  const [uyelerPanel, setUyelerPanel] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentKanalId = useRef<string | undefined>(kanalId);

  useEffect(() => { currentKanalId.current = kanalId; }, [kanalId]);
  useEffect(() => { dispatch(sunuculariGetirThunk()); }, []);

  useEffect(() => {
    if (sunucuId) {
      const sunucu = sunucular.find(s => s._id === sunucuId);
      if (sunucu) {
        dispatch(setSecilenSunucu(sunucu));
        dispatch(kanallariGetirThunk(sunucuId));
        // Sunucu odasına katıl
        const socket = socketAl();
        if (socket) socket.emit('sunucuya_katil', sunucuId);
      }
    }
  }, [sunucuId, sunucular.length]);

  useEffect(() => {
    if (kanalId) {
      const kanal = kanallar.find(k => k._id === kanalId);
      if (kanal) {
        dispatch(setSecilenKanal(kanal));
        if (kanal.tip === 'yazi') {
          dispatch(mesajlariGetirThunk(kanalId));
          // Kanal odasına katıl
          const socket = socketAl();
          if (socket) socket.emit('kanala_katil', kanalId);
        }
      }
    }
  }, [kanalId, kanallar.length]);

  // Socket listener - kanal mesajları
  useEffect(() => {
    const socket = socketAl();
    if (!socket) return;

    const yeniMesajHandler = (mesaj: any) => {
      if (mesaj.kanal === currentKanalId.current) dispatch(mesajEkle(mesaj));
    };
    const duzenleHandler = (data: any) => {
      const mesaj = data.mesaj || data;
      dispatch(mesajGuncelle(mesaj));
    };
    const silHandler = (data: any) => {
      const id = typeof data === 'string' ? data : (data.mesajId || data._id);
      dispatch(mesajSilRedux(id));
    };

    socket.on('yeni_mesaj', yeniMesajHandler);
    socket.on('mesaj_duzenlendi', duzenleHandler);
    socket.on('mesaj_silindi', silHandler);

    return () => {
      socket.off('yeni_mesaj', yeniMesajHandler);
      socket.off('mesaj_duzenlendi', duzenleHandler);
      socket.off('mesaj_silindi', silHandler);
    };
  }, []);

  useEffect(() => { altRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mesajlar]);

  const gonder = () => {
    if (!metin.trim() || !kanalId) return;
    const icerik = metin.trim();
    setMetin('');
    if (duzenlemeModu) {
      api.socketMesajDuzenle(duzenlemeModu.id, icerik);
      setDuzenlemeModu(null);
    } else {
      api.socketMesajGonder(kanalId, icerik, 'metin', cevapVerilen?._id);
      setCevapVerilen(null);
    }
  };

  const gorselSec = async () => {
    if (!kanalId) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const url = await api.gorselYukle(base64);
        const tip = file.type.startsWith('video') ? 'video' : 'gorsel';
        api.socketMesajGonder(kanalId, url, tip);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const sunucuOlustur = async () => {
    if (!yeniSunucuAd.trim()) return;
    try {
      await api.sunucuOlustur(yeniSunucuAd);
      dispatch(sunuculariGetirThunk());
      setSunucuOlusturModal(false);
      setYeniSunucuAd('');
    } catch (err) { console.error(err); }
  };

  const davetleKatil = async () => {
    if (!davetKod.trim()) return;
    try {
      // Davet linki tam URL olabilir, sadece kodu al
      let kod = davetKod.trim();
      if (kod.includes('/')) kod = kod.split('/').pop() || kod;
      await api.sunucuDavetLinkiKatil(kod);
      dispatch(sunuculariGetirThunk());
      setDavetKod('');
      setSunucuOlusturModal(false);
    } catch (err: any) {
      alert(err.message || 'Sunucuya katılınamadı');
    }
  };

  const kanalOlustur = async () => {
    if (!yeniKanalAd.trim() || !sunucuId) return;
    try {
      await api.kanalOlustur(sunucuId, yeniKanalAd, yeniKanalTip, yeniKanalKat);
      dispatch(kanallariGetirThunk(sunucuId));
      setKanalModal(false);
      setYeniKanalAd('');
    } catch (err) { console.error(err); }
  };

  const kanalIkonu = (tip: string) => tip === 'ses' ? '🔊' : tip === 'video' ? '📹' : '#';

  const kategoriler: { [k: string]: typeof kanallar } = {};
  kanallar.forEach(k => {
    const kat = k.kategori || 'Genel';
    if (!kategoriler[kat]) kategoriler[kat] = [];
    kategoriler[kat].push(k);
  });

  const isSahip = secilenSunucu?.sahip === kullanici?.id || secilenSunucu?.sahip === kullanici?._id;

  return (
    <div className={s.container}>
      {/* Sunucu listesi */}
      <div className={s.sunucuList}>
        {sunucular.map(sunucu => (
          <button
            key={sunucu._id}
            className={`${s.sunucuBtn} ${sunucuId === sunucu._id ? s.sunucuBtnAktif : ''}`}
            onClick={() => navigate(`/sunucular/${sunucu._id}`)}
            title={sunucu.ad}
          >
            {sunucu.ikon
              ? <img src={sunucu.ikon} alt="" className={s.sunucuIkon} />
              : <span>{sunucu.ad[0].toUpperCase()}</span>
            }
          </button>
        ))}
        <button className={s.sunucuBtn} onClick={() => setSunucuOlusturModal(true)} title="Sunucu Oluştur / Katıl">
          <span style={{ fontSize: 22, color: 'var(--online)' }}>+</span>
        </button>
      </div>

      {/* Kanal listesi */}
      {secilenSunucu && (
        <div className={s.kanalPanel}>
          {secilenSunucu.banner && (
            <img src={secilenSunucu.banner} alt="banner" className={s.sunucuBanner} />
          )}
          <div className={s.kanalPanelHeader}>
            <span className={s.sunucuAd}>{secilenSunucu.ad}</span>
            {isSahip && (
              <button className={s.kanalEkleBtn} onClick={() => setKanalModal(true)} title="Kanal Ekle">+</button>
            )}
          </div>
          <div className={s.kanalList}>
            {Object.entries(kategoriler).map(([kat, kaList]) => (
              <div key={kat}>
                <div className={s.kategoriBaslik}>{kat.toUpperCase()}</div>
                {kaList.map(kanal => (
                  <button
                    key={kanal._id}
                    className={`${s.kanalBtn} ${kanalId === kanal._id ? s.kanalBtnAktif : ''}`}
                    onClick={() => navigate(`/sunucular/${sunucuId}/${kanal._id}`)}
                  >
                    <span className={s.kanalIkon}>{kanalIkonu(kanal.tip)}</span>
                    <span className={s.kanalAd}>{kanal.ad}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button className={s.uyelerBtn} onClick={() => setUyelerPanel(p => !p)}>
            👥 Üyeler ({secilenSunucu.uyeler?.length || 0})
          </button>
        </div>
      )}

      {/* Sohbet */}
      {secilenKanal ? (
        <div className={s.chat}>
          <div className={s.chatHeader}>
            <span className={s.kanalIkon2}>{kanalIkonu(secilenKanal.tip)}</span>
            <span className={s.kanalBaslik}>{secilenKanal.ad}</span>
            {secilenKanal.konu && <span className={s.kanalKonu}>{secilenKanal.konu}</span>}
          </div>

          {secilenKanal.tip === 'yazi' ? (
            <>
              <div className={s.messages}>
                {mesajlar.map((mesaj, i) => (
                  <MesajItem
                    key={mesaj._id}
                    mesaj={mesaj}
                    benimMi={mesaj.yazar?._id === kullanici?.id}
                    onceki={i > 0 ? mesajlar[i - 1] : null}
                    onProfil={() => setProfilKisi(mesaj.yazar)}
                    onCevapla={() => setCevapVerilen(mesaj)}
                    onDuzenle={() => { setDuzenlemeModu({ id: mesaj._id, icerik: mesaj.icerik }); setMetin(mesaj.icerik); }}
                    onSil={() => { api.socketMesajSil(mesaj._id); dispatch(mesajSilRedux(mesaj._id)); }}
                    cevapVerilen={mesaj.cevapVerilen}
                  />
                ))}
                <div ref={altRef} />
              </div>

              {cevapVerilen && (
                <div className={s.cevapBar}>
                  <span>↩️ <b>{cevapVerilen.yazar?.goruntulenenAd}</b>: {cevapVerilen.icerik?.substring(0, 60)}</span>
                  <button onClick={() => setCevapVerilen(null)} className={s.cevapKapat}>✕</button>
                </div>
              )}

              {duzenlemeModu && (
                <div className={s.cevapBar}>
                  <span>✏️ Mesaj düzenleniyor</span>
                  <button onClick={() => { setDuzenlemeModu(null); setMetin(''); }} className={s.cevapKapat}>✕</button>
                </div>
              )}

              <div className={s.inputArea}>
                <button className={s.mediaBtn} onClick={gorselSec} title="Medya ekle">📎</button>
                <input
                  ref={inputRef}
                  className={s.input}
                  placeholder={`#${secilenKanal.ad} kanalına mesaj gönder`}
                  value={metin}
                  onChange={e => setMetin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), gonder())}
                />
                <button className={s.sendBtn} onClick={gonder} disabled={!metin.trim()}>➤</button>
              </div>
            </>
          ) : (
            <div className={s.sesKanal}>
              <span style={{ fontSize: 48 }}>{secilenKanal.tip === 'video' ? '📹' : '🔊'}</span>
              <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
                {secilenKanal.tip === 'ses' ? 'Ses kanalı' : 'Video kanalı'} — Web versiyonunda yakında!
              </p>
            </div>
          )}
        </div>
      ) : secilenSunucu ? (
        <div className={s.bos}>
          <span style={{ fontSize: 48 }}>🌐</span>
          <h2 style={{ color: 'var(--text-primary)', marginTop: 16 }}>{secilenSunucu.ad}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Bir kanal seç</p>
        </div>
      ) : (
        <div className={s.bos}>
          <span style={{ fontSize: 64 }}>🌐</span>
          <h2 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Bir sunucu seç</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Sol taraftan bir sunucuya gir</p>
        </div>
      )}

      {/* Üyeler paneli */}
      {uyelerPanel && secilenSunucu && (
        <div className={s.uyelerPanel}>
          <div className={s.uyelerHeader}>
            <span>Üyeler</span>
            <button onClick={() => setUyelerPanel(false)} className={s.kapat}>✕</button>
          </div>
          <div className={s.uyelerList}>
            {secilenSunucu.uyeler?.map((uye: any) => {
              const k = uye.kullanici || uye;
              return (
                <button key={k._id} className={s.uyeItem} onClick={() => setProfilKisi(k)}>
                  <div className={s.uyeAvatar}>
                    {k.avatar ? <img src={k.avatar} alt="" className={s.uyeAvatarImg} /> : (k.goruntulenenAd || '?')[0]}
                  </div>
                  <span className={s.uyeAd}>{k.goruntulenenAd || k.kullaniciAdi}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sunucu oluştur/katıl modal */}
      {sunucuOlusturModal && (
        <div className={s.modal} onClick={() => setSunucuOlusturModal(false)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={s.modalBaslik}>Sunucu Oluştur veya Katıl</h2>
            <div className={s.modalSec}>
              <div className={s.modalBolum}>
                <h3>Yeni Sunucu Oluştur</h3>
                <input className={s.modalInput} placeholder="Sunucu adı" value={yeniSunucuAd} onChange={e => setYeniSunucuAd(e.target.value)} onKeyDown={e => e.key === 'Enter' && sunucuOlustur()} />
                <button className={s.modalBtn} onClick={sunucuOlustur}>Oluştur</button>
              </div>
              <div className={s.modalAyrac} />
              <div className={s.modalBolum}>
                <h3>Sunucuya Katıl</h3>
                <input className={s.modalInput} placeholder="Davet kodu veya link" value={davetKod} onChange={e => setDavetKod(e.target.value)} onKeyDown={e => e.key === 'Enter' && davetleKatil()} />
                <button className={s.modalBtn} onClick={davetleKatil}>Katıl</button>
              </div>
            </div>
            <button className={s.modalKapat} onClick={() => setSunucuOlusturModal(false)}>İptal</button>
          </div>
        </div>
      )}

      {/* Kanal oluştur modal */}
      {kanalModal && (
        <div className={s.modal} onClick={() => setKanalModal(false)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={s.modalBaslik}>Kanal Oluştur</h2>
            <div className={s.field}>
              <label className={s.label}>KANAL ADI</label>
              <input className={s.modalInput} placeholder="kanal-adı" value={yeniKanalAd} onChange={e => setYeniKanalAd(e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>KATEGORİ</label>
              <input className={s.modalInput} placeholder="Genel" value={yeniKanalKat} onChange={e => setYeniKanalKat(e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>TİP</label>
              <select className={s.modalInput} value={yeniKanalTip} onChange={e => setYeniKanalTip(e.target.value as any)}>
                <option value="yazi">📝 Yazı</option>
                <option value="ses">🔊 Ses</option>
                <option value="video">📹 Video</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className={s.modalBtn} onClick={kanalOlustur}>Oluştur</button>
              <button className={s.modalKapat} onClick={() => setKanalModal(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {profilKisi && <ProfilModal kisi={profilKisi} onKapat={() => setProfilKisi(null)} />}
    </div>
  );
}
