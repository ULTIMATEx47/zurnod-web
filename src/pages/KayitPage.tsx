import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { AppDispatch, kayitOlThunk } from '../store';
import s from './AuthPage.module.css';

export default function KayitPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ kullaniciAdi: '', goruntulenenAd: '', email: '', sifre: '' });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleKayit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kullaniciAdi || !form.goruntulenenAd || !form.email || !form.sifre) {
      setHata('Tüm alanları doldurun');
      return;
    }
    setYukleniyor(true);
    setHata('');
    try {
      await dispatch(kayitOlThunk(form)).unwrap();
      navigate('/dm');
    } catch (err: any) {
      setHata(err.message || 'Kayıt başarısız');
    } finally {
      setYukleniyor(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className={s.bg}>
      <div className={s.card}>
        <div className={s.logo}>🎵</div>
        <h1 className={s.title}>Hesap Oluştur</h1>

        <form onSubmit={handleKayit} className={s.form}>
          <div className={s.field}>
            <label className={s.label}>KULLANICI ADI</label>
            <input className={s.input} value={form.kullaniciAdi} onChange={set('kullaniciAdi')} placeholder="kullaniciadi" />
          </div>
          <div className={s.field}>
            <label className={s.label}>GÖRÜNTÜLENEN AD</label>
            <input className={s.input} value={form.goruntulenenAd} onChange={set('goruntulenenAd')} placeholder="Adın Soyadın" />
          </div>
          <div className={s.field}>
            <label className={s.label}>E-POSTA</label>
            <input className={s.input} type="email" value={form.email} onChange={set('email')} placeholder="eposta@ornek.com" />
          </div>
          <div className={s.field}>
            <label className={s.label}>ŞİFRE</label>
            <input className={s.input} type="password" value={form.sifre} onChange={set('sifre')} placeholder="••••••••" />
          </div>
          {hata && <p className={s.hata}>{hata}</p>}
          <button className={s.btn} type="submit" disabled={yukleniyor}>
            {yukleniyor ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Kayıt Ol'}
          </button>
        </form>

        <p className={s.altLink}>
          Zaten hesabın var mı? <Link to="/giris" className={s.link}>Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
