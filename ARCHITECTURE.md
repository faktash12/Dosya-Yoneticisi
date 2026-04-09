# File Manager Pro Architecture

## Genel Yaklaşım

Bu iskelet Android odakli bir React Native uygulamasini `feature-based + clean architecture` mantigiyla kurar. Amaç, bugunku mock explorer ihtiyacini karsilarken yarin yerel dosya sistemi, WorkManager tabanli arka plan transferleri ve cloud provider adapterlerini eklemeyi kolaylastirmaktir.

## Neden Zustand?

Bu proje icin Zustand secildi:

- Redux Toolkit'e gore daha az boilerplate uretir.
- Feature bazli store'lari birbirinden bagimsiz tutmak kolaydir.
- Business logic store'a tasinmadan use case + service katmaninda tutulabilir.
- React Native'de hizli prototipleme ve kalici, okunabilir state yapisi sunar.

## Klasorlerin Gorevleri

- `src/app`: uygulama composition root'u, DI, provider, theme, navigation, app-level store
- `src/screens`: navigation seviyesindeki ekranlar
- `src/components`: tekrar kullanilan saf UI bilesenleri
- `src/features`: feature bazli UI controller/store katmani
- `src/domain`: entity, contract ve use case katmani
- `src/data`: mock veya gercek repository/provider implementasyonlari
- `src/services`: logging, queue, network, error mapping gibi uygulama servisleri
- `src/hooks`: feature disi ortak hook'lar
- `src/utils`: saf yardimci fonksiyonlar
- `src/types`: ortak tipler
- `src/constants`: route, provider, app sabitleri

## Baslangic Komutlari

```bash
npx @react-native-community/cli@latest init FileManagerPro --version latest
cd FileManagerPro
npm install
npm run android
```

Bu repo icindeki iskelet icin:

```bash
npm install
npm run start
npm run android
```

## Temel Paketler

- `@react-navigation/*`: tab + stack navigasyon
- `zustand`: sade ve moduler durum yonetimi
- `axios`: cloud provider entegrasyonlarina hazir HTTP client
- `react-error-boundary`: tutarli crash fallback davranisi
- `@react-native-async-storage/async-storage`: ileride favori, ayar, son kullanilanlar persist etmek icin
- `lucide-react-native`: hafif ve profesyonel ikon seti

Gelecek asama icin adaylar:

- `react-native-blob-util` veya native bridge: yerel dosya islemleri
- Android `WorkManager` bridge: arka plan transferleri
- `react-native-mmkv`: yuksek performansli lokal persistence
