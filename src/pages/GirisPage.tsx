import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { AppDispatch, girisYapThunk } from '../store';
import s from './AuthPage.module.css';

export default function GirisPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleGiris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !sifre) { setHata('Tüm alanları doldurun'); return; }
    setYukleniyor(true);
    setHata('');
    try {
      await dispatch(girisYapThunk({ email, sifre })).unwrap();
      navigate('/dm');
    } catch (err: any) {
      setHata(err.message || 'Giriş başarısız');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className={s.bg}>
      <div className={s.card}>
        <div className={s.logo}>🎵</div>
        <h1 className={s.title}>Zurnod'a Hoş Geldin</h1>
        <p className={s.sub}>Devam etmek için giriş yap</p>

        <form onSubmit={handleGiris} className={s.form}>
          <div className={s.field}>
            <label className={s.label}>E-POSTA</label>
            <input
              className={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="eposta@ornek.com"
              autoComplete="email"
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>ŞİFRE</label>
            <input
              className={s.input}
              type="password"
              value={sifre}
              onChange={e => setSifre(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {hata && <p className={s.hata}>{hata}</p>}
          <button className={s.btn} type="submit" disabled={yukleniyor}>
            {yukleniyor ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Giriş Yap'}
          </button>
        </form>

        <p className={s.altLink}>
          Hesabın yok mu? <Link to="/kayit" className={s.link}>Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}
