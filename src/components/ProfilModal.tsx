import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import * as api from '../utils/api';
import s from './ProfilModal.module.css';

interface Props {
  kisi: any;
  onKapat: () => void;
}

export default function ProfilModal({ kisi, onKapat }: Props) {
  const kullanici = useSelector((s: RootState) => s.app.kullanici);
  const cevrimici = useSelector((s: RootState) => s.app.cevrimiciKullanicilar);
  const [mesajYukleniyor, setMesajYukleniyor] = useState(false);

  const benimMi = kisi?._id === kullanici?.id || kisi?.id === kullanici?.id;
  const isOnline = cevrimici.includes(kisi?._id || kisi?.id);

  const durumRengi = (d: string) => {
    if (d === 'cevrimici') return '#43B581';
    if (d === 'uzakta') return '#FAA61A';
    if (d === 'rahatsiz_etme') return '#F04747';
    return '#747F8D';
  };

  const banner = kisi?.profilBanner || kisi?.banner;
  const avatar = kisi?.avatar;
  const ad = kisi?.goruntulenenAd || kisi?.kullaniciAdi || 'Bilinmeyen';
  const kullaniciAdi = kisi?.kullaniciAdi;
  const hakkinda = kisi?.hakkinda;
  const isPremium = kisi?.isPremium;

  return (
    <div className={s.overlay} onClick={onKapat}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        {/* Banner */}
        <div className={s.bannerArea}>
          {banner
            ? <img src={banner} alt="banner" className={s.banner} />
            : <div className={s.bannerDefault} />
          }
          <button className={s.kapatBtn} onClick={onKapat}>✕</button>
        </div>

        {/* Avatar */}
        <div className={s.avatarWrapper}>
          <div className={s.avatarContainer}>
            {avatar
              ? <img src={avatar} alt={ad} className={s.avatar} />
              : <div className={s.avatarPlaceholder}>{ad[0].toUpperCase()}</div>
            }
            <span className={s.statusDot} style={{ background: durumRengi(isOnline ? 'cevrimici' : 'gorunmez') }} />
          </div>
          {isPremium && <span className={s.premiumBadge}>⭐ Premium</span>}
        </div>

        {/* Bilgiler */}
        <div className={s.bilgiler}>
          <div className={s.adRow}>
            <h2 className={s.ad}>{ad}</h2>
          </div>
          {kullaniciAdi && <p className={s.kullaniciAdi}>@{kullaniciAdi}</p>}

          {kisi?.ozelDurum && (
            <div className={s.ozelDurum}>
              <span>{kisi.ozelDurum}</span>
            </div>
          )}

          {hakkinda && (
            <div className={s.bolum}>
              <div className={s.bolumBaslik}>HAKKINDA</div>
              <p className={s.bolumIcerik}>{hakkinda}</p>
            </div>
          )}

          {kisi?.olusturulmaTarihi && (
            <div className={s.bolum}>
              <div className={s.bolumBaslik}>KATILMA TARİHİ</div>
              <p className={s.bolumIcerik}>
                {new Date(kisi.olusturulmaTarihi).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}

          {!benimMi && (
            <div className={s.aksiyonlar}>
              <button
                className={s.mesajBtn}
                onClick={async () => {
                  setMesajYukleniyor(true);
                  try {
                    const dm = await api.dmAc(kisi._id || kisi.id);
                    window.location.href = `/dm/${dm._id}`;
                  } catch (e) { console.error(e); }
                  finally { setMesajYukleniyor(false); }
                }}
                disabled={mesajYukleniyor}
              >
                💬 Mesaj Gönder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
