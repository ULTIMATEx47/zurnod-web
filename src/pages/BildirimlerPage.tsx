import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, bildirimleriGetirThunk, bildirimlerSifirla } from '../store';
import * as api from '../utils/api';
import s from './BildirimlerPage.module.css';

export default function BildirimlerPage() {
  const dispatch = useDispatch<AppDispatch>();
  const bildirimler = useSelector((s: RootState) => s.app.bildirimler);

  useEffect(() => {
    dispatch(bildirimleriGetirThunk());
    dispatch(bildirimlerSifirla());
  }, []);

  const hepsiniOku = async () => {
    await api.tumBildirimleriOku();
    dispatch(bildirimleriGetirThunk());
  };

  const ikon = (tip: string) => {
    if (tip === 'arkadaslik') return '👥';
    if (tip === 'mesaj') return '💬';
    if (tip === 'bahset') return '@';
    if (tip === 'davet') return '🌐';
    return '🔔';
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.baslik}>Bildirimler</h2>
        {bildirimler.length > 0 && (
          <button className={s.hepsiniOkuBtn} onClick={hepsiniOku}>
            Hepsini Okundu İşaretle
          </button>
        )}
      </div>
      <div className={s.liste}>
        {bildirimler.length === 0 ? (
          <div className={s.bos}>
            <span style={{ fontSize: 48 }}>🔔</span>
            <p>Henüz bildirim yok</p>
          </div>
        ) : (
          bildirimler.map((b: any) => (
            <div key={b._id} className={`${s.item} ${!b.okundu ? s.itemOkunmamis : ''}`}>
              <div className={s.ikon}>{ikon(b.tip)}</div>
              <div className={s.bilgi}>
                <p className={s.mesaj}>{b.mesaj || b.icerik}</p>
                <span className={s.tarih}>
                  {new Date(b.olusturulmaTarihi || b.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              {!b.okundu && <span className={s.dot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
