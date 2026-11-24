# Vaultly — uruchomienie fundamentu

## Wymagania

- Node.js LTS
- Android Studio dla Androida lub macOS z Xcode dla iOS
- opcjonalnie konto Expo dla buildów EAS

## Instalacja

```powershell
npm install
npm run typecheck
npm run lint
npm test
```

Projekt jest przygotowany pod Development Build, nie Expo Go:

```powershell
npx expo prebuild --clean
npm run android
```

Na macOS można użyć `npm run ios`. Alternatywnie build deweloperski EAS korzysta z profilu `development` w `eas.json`.

## Aktualny zakres

Działa routing, system motywów, komponenty UI, inicjalizacja SQLite i migracje. Tworzenie oraz odblokowanie sejfu używa natywnego Argon2id i AES-256-GCM. Można dodać login, odczytać szczegóły i wykonać miękkie usunięcie; poufny payload jest szyfrowany przed zapisem w SQLite.

Moduł Argon2 zawiera kod natywny, dlatego po jego dodaniu trzeba ponownie wykonać `npx expo prebuild --clean` i zbudować Development Build. Funkcji nie należy testować przez Expo Go.
