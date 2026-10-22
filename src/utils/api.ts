import { io, Socket } from 'socket.io-client';

const API_URL = 'https://zurnod-backend.onrender.com';

let socket: Socket | null = null;

// ==================== HTTP ====================
export const istek = async (method: string, yol: string, veri?: any) => {
  const token = localStorage.getItem('token');
  const yanit = await fetch(`${API_URL}${yol}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: veri ? JSON.stringify(veri) : undefined
  });
  const json = await yanit.json();
  if (!yanit.ok) throw new Error(json.hata || 'Bir hata olustu');
  return json;
};

// ==================== AUTH ====================
export const kayitOl = async (kullaniciAdi: string, goruntulenenAd: string, email: string, sifre: string) => {
  const yanit = await istek('POST', '/api/kayit', { kullaniciAdi, goruntulenenAd, email, sifre });
  localStorage.setItem('token', yanit.token);
  localStorage.setItem('kullanici', JSON.stringify(yanit.kullanici));
  return yanit;
};

export const googleGirisYap = async (idToken: string) => {
  const yanit = await istek('POST', '/api/google_giris', { idToken });
  localStorage.setItem('token', yanit.token);
  localStorage.setItem('kullanici', JSON.stringify(yanit.kullanici));
  return yanit;
};

export const girisYap = async (email: string, sifre: string) => {
  const yanit = await istek('POST', '/api/giris', { email, sifre });
  localStorage.setItem('token', yanit.token);
  localStorage.setItem('kullanici', JSON.stringify(yanit.kullanici));
  return yanit;
};

export const cikisYap = async () => {
  socketBaglantiKes();
  localStorage.removeItem('token');
  localStorage.removeItem('kullanici');
};

export const tokenKontrol = async () => {
  return await istek('GET', '/api/profil');
};

export const profilGuncelle = async (veri: any) => {
  return await istek('PUT', '/api/profil', veri);
};

export const sifreDegistir = async (mevcutSifre: string, yeniSifre: string) => {
  return await istek('PUT', '/api/profil/sifre', { mevcutSifre, yeniSifre });
};

// ==================== SOCKET ====================
export const socketBaglan = (token: string) => {
  if (socket?.connected) {
    socket.emit('kimlik_dogrula', token);
    return socket;
  }
  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  socket.on('connect', () => {
    console.log('Socket baglandi');
    socket?.emit('kimlik_dogrula', token);
  });
  socket.on('disconnect', () => console.log('Socket koptu'));
  return socket;
};

export const socketAl = () => socket;

export const socketBaglantiKes = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

// ==================== SOCKET MESAJ ====================
export const socketMesajGonder = (kanalId: string, icerik: string, tip?: string, cevapVerilenId?: string) => {
  socket?.emit('mesaj_gonder', { kanalId, icerik, tip: tip || 'metin', cevapVerilenId });
};

export const socketDmGonder = (dmId: string, icerik: string, tip?: string, cevapVerilenId?: string) => {
  socket?.emit('dm_gonder', { dmId, icerik, tip: tip || 'metin', cevapVerilenId });
};

export const socketMesajDuzenle = (mesajId: string, icerik: string) => {
  socket?.emit('mesaj_duzenle', { mesajId, icerik });
};

export const socketMesajSil = (mesajId: string) => {
  socket?.emit('mesaj_sil', mesajId);
};

export const socketTepki = (mesajId: string, emoji: string) => {
  socket?.emit('mesaj_tepki', { mesajId, emoji });
};

export const kanalaKatil = (kanalId: string) => {
  socket?.emit('kanala_katil', kanalId);
};

export const sunucuyaKatilSocket = (sunucuId: string) => {
  socket?.emit('sunucuya_katil', sunucuId);
};

// ==================== SUNUCULAR ====================
export const sunuculariGetir = async () => istek('GET', '/api/sunucular');
export const sunucuOlustur = async (ad: string, ikon?: string) => istek('POST', '/api/sunucular', { ad, ikon });
export const sunucuGuncelle = async (id: string, veri: any) => istek('PUT', `/api/sunucular/${id}`, veri);
export const sunucuSil = async (id: string) => istek('DELETE', `/api/sunucular/${id}`);
export const sunucuyaKatil = async (davetKodu: string) => istek('POST', `/api/sunucular/${davetKodu}/katil`);
export const sunucudanAyril = async (id: string) => istek('DELETE', `/api/sunucular/${id}/ayril`);
export const sunucuDavetLinkiKatil = async (link: string) => istek('POST', `/api/sunucular/davet/${link}`);
export const sunucuDetayGetir = async (id: string) => istek('GET', `/api/sunucular/${id}`);

// ==================== KANALLAR ====================
// Backend'de ayri /kanallar endpoint yok; sunucu detayi icinden gelir
export const kanallariGetir = async (sunucuId: string) => {
  const sunucu = await istek('GET', `/api/sunucular/${sunucuId}`);
  return sunucu.kanallar || [];
};
export const kanalOlustur = async (sunucuId: string, ad: string, tip: string, kategori: string) =>
  istek('POST', `/api/sunucular/${sunucuId}/kanallar`, { ad, tip, kategori });
export const kanalSil = async (sunucuId: string, kanalId: string) =>
  istek('DELETE', `/api/sunucular/${sunucuId}/kanallar/${kanalId}`);

// ==================== MESAJLAR ====================
export const mesajlariGetir = async (kanalId: string, sayfa = 1) =>
  istek('GET', `/api/kanallar/${kanalId}/mesajlar?sayfa=${sayfa}`);
export const mesajSil = async (id: string) =>
  istek('DELETE', `/api/mesajlar/${id}/herkesten-sil`);
export const mesajDuzenle = async (id: string, icerik: string) =>
  istek('PUT', `/api/mesajlar/${id}`, { icerik });

// ==================== DM ====================
export const dmleriGetir = async () => istek('GET', '/api/dmler');
export const dmAc = async (kullaniciId: string) => istek('POST', '/api/dmler', { kullaniciId });
export const dmMesajlariGetir = async (dmId: string, sayfa = 1) =>
  istek('GET', `/api/dmler/${dmId}/mesajlar?sayfa=${sayfa}`);
export const dmMesajGonder = (dmId: string, icerik: string, tip?: string, cevapVerilenId?: string) => {
  socketDmGonder(dmId, icerik, tip, cevapVerilenId);
};

// ==================== ARKADASLAR ====================
export const arkadaslariGetir = async () => istek('GET', '/api/arkadaslar');
export const arkadaslikIstekleriniGetir = async () => istek('GET', '/api/arkadaslar/bekleyen');
export const arkadaslikIstegiGonder = async (kullaniciAdi: string) =>
  istek('POST', '/api/arkadaslar/istek', { kullaniciAdi });
export const arkadaslikIstegiKabul = async (arkadaslikId: string) =>
  istek('PUT', `/api/arkadaslar/istek/${arkadaslikId}`, { aksiyon: 'kabul' });
export const arkadaslikIstegiReddet = async (arkadaslikId: string) =>
  istek('PUT', `/api/arkadaslar/istek/${arkadaslikId}`, { aksiyon: 'red' });
export const arkadasSil = async (arkadaslikId: string) =>
  istek('DELETE', `/api/arkadaslar/${arkadaslikId}`);

// ==================== BILDIRIMLER ====================
export const bildirimleriGetir = async () => {
  try { return await istek('GET', '/api/bildirimler'); } catch { return []; }
};
export const bildirimOku = async (bildirimId: string) => {
  try { return await istek('PUT', `/api/bildirimler/${bildirimId}/oku`); } catch { return {}; }
};
export const tumBildirimleriOku = async () => {
  try { return await istek('PUT', '/api/bildirimler/hepsini-oku'); } catch { return {}; }
};

// ==================== DURUM ====================
export const durumlariGetir = async () => istek('GET', '/api/durumlar');
export const durumPaylas = async (tip: string, icerik: string, arkaplanRenk?: string, gercekTip?: string) =>
  istek('POST', '/api/durumlar', { tip, icerik, arkaplanRenk, gercekTip });
export const durumSil = async (durumId: string) => istek('DELETE', `/api/durumlar/${durumId}`);
export const durumGor = async (durumId: string) => istek('POST', `/api/durumlar/${durumId}/gor`);

// ==================== ARAMA ====================
export const kullanicilariAra = async (sorgu: string) =>
  istek('GET', `/api/kullanici/ara?kullaniciAdi=${encodeURIComponent(sorgu)}`);
export const kullaniciBilgisiGetir = async (kullaniciId: string) => {
  try { return await istek('GET', `/api/kullanicilar/${kullaniciId}`); } catch { return null; }
};

// ==================== GORSEL ====================
export const gorselYukle = async (base64: string) => {
  const yanit = await istek('POST', '/api/gorseller', { gorsel: base64 });
  return yanit.url;
};

// ==================== SUNUCU UYELER / ROLLER ====================
export const sunucuUyeleriGetir = async (sunucuId: string) =>
  istek('GET', `/api/sunucular/${sunucuId}/uyeler`);
export const sunucudanKick = async (sunucuId: string, kullaniciId: string) =>
  istek('DELETE', `/api/sunucular/${sunucuId}/uyeler/${kullaniciId}/at`);
export const sunucudanYasak = async (sunucuId: string, kullaniciId: string) =>
  istek('POST', `/api/sunucular/${sunucuId}/ban`, { kullaniciId });
export const rolOlustur = async (sunucuId: string, ad: string, renk: string) =>
  istek('POST', `/api/sunucular/${sunucuId}/roller`, { ad, renk });
export const rolSil = async (sunucuId: string, rolId: string) =>
  istek('DELETE', `/api/sunucular/${sunucuId}/roller/${rolId}`);
export const uyeyeRolVer = async (sunucuId: string, kullaniciId: string, rolId: string) =>
  istek('PUT', `/api/sunucular/${sunucuId}/uyeler/${kullaniciId}/roller`, { rolId });
export const uyedenRolAl = async (sunucuId: string, kullaniciId: string, rolId: string) =>
  istek('DELETE', `/api/sunucular/${sunucuId}/uyeler/${kullaniciId}/roller/${rolId}`);
export const uyeYoneticiYap = async (sunucuId: string, kullaniciId: string) =>
  istek('PUT', `/api/sunucular/${sunucuId}/uyeler/${kullaniciId}/rol`, { rol: 'yonetici' });

// ==================== PREMIUM ====================
export const premiumKodKullan = async (kod: string) =>
  istek('POST', '/api/premium/kod-kullan', { kod });

// ==================== ADMIN ====================
export const adminPremiumKodOlustur = async (adet: number, gecerlilikGun: number) =>
  istek('POST', '/api/admin/premium-kod-olustur', { adet, gecerlilikGun });
export const adminPremiumKodlariGetir = async () =>
  istek('GET', '/api/admin/premium-kodlar');
export const adminPremiumKodIptal = async (kod: string) =>
  istek('DELETE', `/api/admin/premium-kodlar/${kod}`);
export const adminPremiumKodSil = async (kodId: string) =>
  istek('DELETE', `/api/admin/premium-kodlar-sil/${kodId}`);
export const adminKullanicilariGetir = async () =>
  istek('GET', '/api/admin/kullanicilar');
export const adminKullaniciSil = async (kullaniciId: string) =>
  istek('DELETE', `/api/admin/kullanicilar/${kullaniciId}`);
export const adminKullaniciYoneticiYap = async (kullaniciId: string) =>
  istek('PUT', `/api/admin/kullanicilar/${kullaniciId}/yetki`, { isAdmin: true });
