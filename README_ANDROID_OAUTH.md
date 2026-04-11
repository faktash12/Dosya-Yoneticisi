# Android OAuth Kurulumu

Bu proje React Native CLI tabanlidir ve Android package name degeri `com.filemanagerpro` olarak kullanilir.

## Google Drive

1. Google Cloud Console icinde Android OAuth client olusturun.
2. Package name olarak `com.filemanagerpro` girin.
3. Uygulamanin imzaladigi SHA-1 ve SHA-256 degerlerini ayni client icine ekleyin.
4. `.env` dosyasinda `GOOGLE_DRIVE_CLIENT_ID` alanini doldurun.
5. `GOOGLE_DRIVE_REDIRECT_URI` bos birakilabilir. Bos oldugunda uygulama su callback adresini otomatik kullanir:

   `com.googleusercontent.apps.<client-id-without-.apps.googleusercontent.com>:/oauth2redirect`

6. AndroidManifest icindeki Google deep link filtresi bu callback ile eslesir.

Google tarafinda "Access blocked" goruluyorsa tipik nedenler:
- yanlis package name
- eksik SHA-1 / SHA-256
- farkli OAuth client id kullanimi
- Android yerine Web client id kullanimi

## Yandex Disk

1. Yandex OAuth uygulama ayarlarinda callback URL ile `.env` icindeki `YANDEX_REDIRECT_URI` birebir ayni olmalidir.
2. Varsayilan callback:

   `filemanagerpro://oauth/yandex_disk`

3. `YANDEX_CLIENT_ID` ve `YANDEX_CLIENT_SECRET` alanlarini `.env` icinde doldurun.
4. Manifest deep link filtresi `filemanagerpro://oauth/yandex_disk` adresini dinler.

Yandex tarafinda `redirect_uri does not match the callback` hatasi goruluyorsa:
- dashboard'daki callback adresi ile `.env` birebir eslesmiyordur
- scheme / host / path parcalarindan biri farklidir
- callback URL sonunda fazladan slash vardir

## OneDrive ve Dropbox

Birinci fazda sadece placeholder konumundadir. `.env` anahtarlari dursa da Android tarafinda gercek OAuth akisi kurulmamistir.
