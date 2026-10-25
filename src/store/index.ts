import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '../utils/api';

export interface Kullanici {
  id: string;
  _id?: string;
  kullaniciAdi: string;
  goruntulenenAd: string;
  email: string;
  avatar?: string;
  banner?: string;
  hakkinda?: string;
  durum: 'cevrimici' | 'uzakta' | 'rahatsiz_etme' | 'gorunmez';
  ozelDurum?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  olusturulmaTarihi?: string;
  profilBanner?: string;
  sohbetTema?: string;
  mesajBalonRengi?: string;
  okuduGizle?: boolean;
  cevrimiciGizle?: boolean;
}

export interface Mesaj {
  _id: string;
  icerik: string;
  tip?: string;
  yazar: { _id: string; kullaniciAdi: string; goruntulenenAd: string; avatar?: string; mesajBalonRengi?: string };
  kanal?: string;
  dm?: string;
  duzenlendiMi: boolean;
  cevapVerilen?: Mesaj;
  reaksiyonlar: { emoji: string; kullanicilar: string[] }[];
  olusturulmaTarihi: string;
  goruldu?: boolean;
}

export interface Kanal {
  _id: string;
  ad: string;
  tip: 'yazi' | 'ses' | 'video';
  konu?: string;
  kategori: string;
  sira: number;
}

export interface Sunucu {
  _id: string;
  ad: string;
  aciklama?: string;
  ikon?: string;
  banner?: string;
  davetLinki?: string;
  sahip: string;
  roller?: { _id: string; ad: string; renk: string }[];
  uyeler: { kullanici: any; rol: string; ozelRoller?: string[] }[];
}

export interface DM {
  _id: string;
  katilimcilar: Kullanici[];
  sonMesaj?: Mesaj;
  okunmamisSayisi?: number;
}

export interface Arkadaslik {
  id: string;
  _id?: string;
  kullanici?: Kullanici;
  arkadaslik?: Kullanici;
  durum: 'beklemede' | 'kabul_edildi' | 'reddedildi';
  gonderen?: Kullanici;
  alan?: Kullanici;
}

interface AppState {
  kullanici: Kullanici | null;
  sunucular: Sunucu[];
  secilenSunucu: Sunucu | null;
  kanallar: Kanal[];
  secilenKanal: Kanal | null;
  mesajlar: Mesaj[];
  dmler: DM[];
  secilenDM: DM | null;
  dmMesajlari: Mesaj[];
  arkadaslar: Arkadaslik[];
  bildirimler: any[];
  okunmamisBildirimSayisi: number;
  yukleniyor: boolean;
  hata: string | null;
  tema: 'karanlik' | 'aydinlik';
  cevrimiciKullanicilar: string[];
}

const initialState: AppState = {
  kullanici: null,
  sunucular: [],
  secilenSunucu: null,
  kanallar: [],
  secilenKanal: null,
  mesajlar: [],
  dmler: [],
  secilenDM: null,
  dmMesajlari: [],
  arkadaslar: [],
  bildirimler: [],
  okunmamisBildirimSayisi: 0,
  yukleniyor: false,
  hata: null,
  tema: 'karanlik',
  cevrimiciKullanicilar: [],
};

// Thunks
export const girisYapThunk = createAsyncThunk('app/giris', async ({ email, sifre }: { email: string; sifre: string }) => {
  return await api.girisYap(email, sifre);
});

export const kayitOlThunk = createAsyncThunk('app/kayit', async (veri: { kullaniciAdi: string; goruntulenenAd: string; email: string; sifre: string }) => {
  return await api.kayitOl(veri.kullaniciAdi, veri.goruntulenenAd, veri.email, veri.sifre);
});

export const tokenKontrolThunk = createAsyncThunk('app/tokenKontrol', async () => {
  return await api.tokenKontrol();
});

export const sunuculariGetirThunk = createAsyncThunk('app/sunuculariGetir', async () => {
  return await api.sunuculariGetir();
});

export const kanallariGetirThunk = createAsyncThunk('app/kanallariGetir', async (sunucuId: string) => {
  return await api.kanallariGetir(sunucuId);
});

export const mesajlariGetirThunk = createAsyncThunk('app/mesajlariGetir', async (kanalId: string) => {
  return await api.mesajlariGetir(kanalId);
});

export const dmleriGetirThunk = createAsyncThunk('app/dmleriGetir', async () => {
  return await api.dmleriGetir();
});

export const dmMesajlariGetirThunk = createAsyncThunk('app/dmMesajlariGetir', async (dmId: string) => {
  return await api.dmMesajlariGetir(dmId);
});

export const arkadaslariGetirThunk = createAsyncThunk('app/arkadaslariGetir', async () => {
  return await api.arkadaslariGetir();
});

export const bildirimleriGetirThunk = createAsyncThunk('app/bildirimleriGetir', async () => {
  return await api.bildirimleriGetir();
});

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setKullanici: (state, action: PayloadAction<Kullanici | null>) => {
      state.kullanici = action.payload;
    },
    setTema: (state, action: PayloadAction<'karanlik' | 'aydinlik'>) => {
      state.tema = action.payload;
    },
    setSecilenSunucu: (state, action: PayloadAction<Sunucu | null>) => {
      state.secilenSunucu = action.payload;
    },
    setSecilenKanal: (state, action: PayloadAction<Kanal | null>) => {
      state.secilenKanal = action.payload;
    },
    setSecilenDM: (state, action: PayloadAction<DM | null>) => {
      state.secilenDM = action.payload;
    },
    mesajEkle: (state, action: PayloadAction<Mesaj>) => {
      const exists = state.mesajlar.find(m => m._id === action.payload._id);
      if (!exists) state.mesajlar.push(action.payload);
    },
    dmMesajEkle: (state, action: PayloadAction<Mesaj>) => {
      const exists = state.dmMesajlari.find(m => m._id === action.payload._id);
      if (!exists) state.dmMesajlari.push(action.payload);
    },
    mesajGuncelle: (state, action: PayloadAction<Mesaj>) => {
      const idx = state.mesajlar.findIndex(m => m._id === action.payload._id);
      if (idx !== -1) state.mesajlar[idx] = action.payload;
    },
    mesajSilRedux: (state, action: PayloadAction<string>) => {
      state.mesajlar = state.mesajlar.filter(m => m._id !== action.payload);
    },
    dmMesajSilRedux: (state, action: PayloadAction<string>) => {
      state.dmMesajlari = state.dmMesajlari.filter(m => m._id !== action.payload);
    },
    reaksiyonGuncelle: (state, action: PayloadAction<{ mesajId: string; reaksiyonlar: any[] }>) => {
      const mesaj = state.mesajlar.find(m => m._id === action.payload.mesajId);
      if (mesaj) mesaj.reaksiyonlar = action.payload.reaksiyonlar;
      const dmMesaj = state.dmMesajlari.find(m => m._id === action.payload.mesajId);
      if (dmMesaj) dmMesaj.reaksiyonlar = action.payload.reaksiyonlar;
    },
    setCevrimiciKullanicilar: (state, action: PayloadAction<string[]>) => {
      state.cevrimiciKullanicilar = action.payload;
    },
    kullaniciCevrimiciEkle: (state, action: PayloadAction<string>) => {
      if (!state.cevrimiciKullanicilar.includes(action.payload))
        state.cevrimiciKullanicilar.push(action.payload);
    },
    kullaniciCevrimiciBosalt: (state, action: PayloadAction<string>) => {
      state.cevrimiciKullanicilar = state.cevrimiciKullanicilar.filter(id => id !== action.payload);
    },
    setHata: (state, action: PayloadAction<string | null>) => {
      state.hata = action.payload;
    },
    bildirimEkle: (state, action: PayloadAction<any>) => {
      state.bildirimler.unshift(action.payload);
      state.okunmamisBildirimSayisi += 1;
    },
    bildirimlerSifirla: (state) => {
      state.okunmamisBildirimSayisi = 0;
    },
    sunucuGuncelleRedux: (state, action: PayloadAction<Sunucu>) => {
      const idx = state.sunucular.findIndex(s => s._id === action.payload._id);
      if (idx !== -1) state.sunucular[idx] = action.payload;
      if (state.secilenSunucu?._id === action.payload._id) state.secilenSunucu = action.payload;
    },
    dmGuncelleRedux: (state, action: PayloadAction<DM>) => {
      const idx = state.dmler.findIndex(d => d._id === action.payload._id);
      if (idx !== -1) state.dmler[idx] = action.payload;
      else state.dmler.unshift(action.payload);
    },
    cikisYap: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    const mapKullanici = (k: any): Kullanici => ({
      id: k._id || k.id,
      _id: k._id || k.id,
      kullaniciAdi: k.kullaniciAdi,
      goruntulenenAd: k.goruntulenenAd,
      email: k.email,
      avatar: k.avatar,
      banner: k.banner,
      hakkinda: k.hakkinda,
      durum: k.durum || 'cevrimici',
      ozelDurum: k.ozelDurum,
      isAdmin: k.isAdmin,
      isPremium: k.isPremium,
      olusturulmaTarihi: k.olusturulmaTarihi,
      profilBanner: k.profilBanner,
      sohbetTema: k.sohbetTema,
      mesajBalonRengi: k.mesajBalonRengi,
      okuduGizle: k.okuduGizle,
      cevrimiciGizle: k.cevrimiciGizle,
    });

    builder
      .addCase(girisYapThunk.fulfilled, (state, action) => {
        state.kullanici = mapKullanici(action.payload.kullanici);
      })
      .addCase(kayitOlThunk.fulfilled, (state, action) => {
        state.kullanici = mapKullanici(action.payload.kullanici);
      })
      .addCase(tokenKontrolThunk.fulfilled, (state, action) => {
        state.kullanici = mapKullanici(action.payload);
      })
      .addCase(tokenKontrolThunk.rejected, (state) => {
        state.kullanici = null;
      })
      .addCase(sunuculariGetirThunk.fulfilled, (state, action) => {
        state.sunucular = action.payload;
      })
      .addCase(kanallariGetirThunk.fulfilled, (state, action) => {
        // Backend { sunucu, kanallar } veya dogrudan kanallar[] donduruyor
        const payload = action.payload;
        if (Array.isArray(payload)) {
          state.kanallar = payload;
        } else if (payload && payload.kanallar) {
          state.kanallar = payload.kanallar;
          // Sunucu detayini (uyeler dahil) her zaman guncelle
          if (payload.sunucu) {
            state.secilenSunucu = payload.sunucu;
          }
        }
      })
      .addCase(mesajlariGetirThunk.fulfilled, (state, action) => {
        state.mesajlar = action.payload;
      })
      .addCase(dmleriGetirThunk.fulfilled, (state, action) => {
        state.dmler = action.payload;
      })
      .addCase(dmMesajlariGetirThunk.fulfilled, (state, action) => {
        state.dmMesajlari = action.payload;
      })
      .addCase(arkadaslariGetirThunk.fulfilled, (state, action) => {
        state.arkadaslar = action.payload;
      })
      .addCase(bildirimleriGetirThunk.fulfilled, (state, action) => {
        state.bildirimler = action.payload;
        state.okunmamisBildirimSayisi = action.payload.filter((b: any) => !b.okundu).length;
      });
  },
});

export const {
  setKullanici, setTema, setSecilenSunucu, setSecilenKanal, setSecilenDM,
  mesajEkle, dmMesajEkle, mesajGuncelle, mesajSilRedux, dmMesajSilRedux,
  reaksiyonGuncelle, setCevrimiciKullanicilar, kullaniciCevrimiciEkle,
  kullaniciCevrimiciBosalt, setHata, bildirimEkle, bildirimlerSifirla,
  sunucuGuncelleRedux, dmGuncelleRedux, cikisYap,
} = appSlice.actions;

export const store = configureStore({ reducer: { app: appSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
