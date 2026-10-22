import React, { useState } from 'react';
import * as api from '../utils/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import s from './MesajItem.module.css';

interface Props {
  mesaj: any;
  benimMi: boolean;
  onceki: any;
  onProfil?: () => void;
  onCevapla?: () => void;
  onDuzenle?: () => void;
  onSil?: () => void;
  cevapVerilen?: any;
}

function formatTarih(tarih: string) {
  const d = new Date(tarih);
  const simdi = new Date();
  const fark = simdi.getTime() - d.getTime();
  if (fark < 60000) return 'az önce';
  if (fark < 3600000) return `${Math.floor(fark / 60000)} dk önce`;
  if (d.toDateString() === simdi.toDateString()) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MesajItem({ mesaj, benimMi, onceki, onProfil, onCevapla, onDuzenle, onSil, cevapVerilen }: Props) {
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const [menu, setMenu] = useState(false);
  const [reaksiyonPicker, setReaksiyonPicker] = useState(false);

  const EMOJILER = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉'];

  const ayniGonderici = onceki?.yazar?._id === mesaj.yazar?._id &&
    (new Date(mesaj.olusturulmaTarihi).getTime() - new Date(onceki.olusturulmaTarihi).getTime()) < 300000;

  const reaksiyon = (emoji: string) => {
    api.socketTepki(mesaj._id, emoji);
    setReaksiyonPicker(false);
  };

  const renderIcerik = () => {
    if (mesaj.tip === 'gorsel' || (mesaj.icerik?.match(/\.(jpg|jpeg|png|gif|webp)/i) && mesaj.tip !== 'metin')) {
      return <img src={mesaj.icerik} alt="gorsel" className={s.gorsel} onClick={() => window.open(mesaj.icerik, '_blank')} />;
    }
    if (mesaj.tip === 'video' || mesaj.icerik?.match(/\.(mp4|webm|mov)/i)) {
      return <video src={mesaj.icerik} controls className={s.video} />;
    }
    if (mesaj.tip === 'ses' || mesaj.icerik?.match(/\.(mp3|ogg|wav|m4a)/i)) {
      return <audio src={mesaj.icerik} controls className={s.audio} />;
    }
    if (mesaj.tip === 'gif') {
      return <img src={mesaj.icerik} alt="gif" className={s.gorsel} />;
    }
    if (mesaj.tip === 'dosya') {
      const ad = mesaj.icerik.split('/').pop() || 'dosya';
      return <a href={mesaj.icerik} target="_blank" rel="noreferrer" className={s.dosya}>📎 {ad}</a>;
    }
    return <span className={s.metin}>{mesaj.icerik}</span>;
  };

  const benimMesajMi = mesaj.yazar?._id === kullanici?.id || mesaj.yazar?.id === kullanici?.id;
  const balon = mesaj.yazar?.mesajBalonRengi;

  return (
    <div
      className={`${s.row} ${benimMi ? s.rowBenim : ''}`}
      onMouseEnter={() => setMenu(true)}
      onMouseLeave={() => { setMenu(false); setReaksiyonPicker(false); }}
    >
      {/* Yanıtlanan mesaj */}
      {cevapVerilen && (
        <div className={`${s.cevap} ${benimMi ? s.cevapBenim : ''}`}>
          <span className={s.cevapAd}>{cevapVerilen.yazar?.goruntulenenAd}: </span>
          <span className={s.cevapIcerik}>{cevapVerilen.icerik?.substring(0, 60)}</span>
        </div>
      )}

      <div className={`${s.mesajRow} ${benimMi ? s.mesajRowBenim : ''}`}>
        {/* Avatar (karşıdan gelenler için) */}
        {!benimMi && !ayniGonderici && (
          <button className={s.avatar} onClick={onProfil}>
            {mesaj.yazar?.avatar
              ? <img src={mesaj.yazar.avatar} alt="" className={s.avatarImg} />
              : <span>{(mesaj.yazar?.goruntulenenAd || '?')[0].toUpperCase()}</span>
            }
          </button>
        )}
        {!benimMi && ayniGonderici && <div style={{ width: 36, flexShrink: 0 }} />}

        <div className={`${s.bubble} ${benimMi ? s.bubbleBenim : s.bubbleKarsi}`}
          style={balon && !benimMi ? { background: balon } : undefined}
        >
          {/* İsim + Tarih */}
          {!ayniGonderici && (
            <div className={s.meta}>
              {!benimMi && (
                <button className={s.isim} onClick={onProfil}>{mesaj.yazar?.goruntulenenAd || mesaj.yazar?.kullaniciAdi}</button>
              )}
              <span className={s.tarih}>{formatTarih(mesaj.olusturulmaTarihi)}</span>
              {mesaj.duzenlendiMi && <span className={s.duzenlendi}>(düzenlendi)</span>}
            </div>
          )}
          {renderIcerik()}

          {/* Reaksiyonlar */}
          {mesaj.reaksiyonlar?.length > 0 && (
            <div className={s.reaksiyonlar}>
              {mesaj.reaksiyonlar.map((r: any) => (
                <button key={r.emoji} className={`${s.reaksiyon} ${r.kullanicilar?.includes(kullanici?.id) ? s.reaksiyonAktif : ''}`}
                  onClick={() => reaksiyon(r.emoji)}>
                  {r.emoji} <span>{r.kullanicilar?.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aksiyon menü */}
        {menu && (
          <div className={`${s.aksiyonlar} ${benimMi ? s.aksiyonlarBenim : ''}`}>
            <button className={s.aksBtn} onClick={() => setReaksiyonPicker(p => !p)} title="Reaksiyon">😊</button>
            {onCevapla && <button className={s.aksBtn} onClick={onCevapla} title="Yanıtla">↩️</button>}
            {benimMesajMi && onDuzenle && <button className={s.aksBtn} onClick={onDuzenle} title="Düzenle">✏️</button>}
            {benimMesajMi && onSil && <button className={s.aksBtn} onClick={onSil} title="Sil" style={{ color: '#F04747' }}>🗑️</button>}
            <button className={s.aksBtn} onClick={() => navigator.clipboard.writeText(mesaj.icerik)} title="Kopyala">📋</button>
          </div>
        )}

        {/* Emoji picker */}
        {reaksiyonPicker && (
          <div className={`${s.emojiPicker} ${benimMi ? s.emojiPickerBenim : ''}`}>
            {EMOJILER.map(e => (
              <button key={e} className={s.emojiBtn} onClick={() => reaksiyon(e)}>{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
