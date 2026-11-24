**# Vaultly — instrukcje projektu**

**## 1. Opis projektu**

Należy zbudować wysokiej jakości mobilny menedżer haseł o nazwie ****Vaultly****, gotowy do zastosowania produkcyjnego.

Vaultly to ****menedżer haseł klasy premium, działający przede wszystkim offline****, tworzony od podstaw przy użyciu React Native i TypeScript.

Pierwsza wersja musi działać całkowicie offline. Architektura powinna jednak od samego początku umożliwiać późniejsze dodanie warstwy szyfrowanej synchronizacji z chmurą bez konieczności przepisywania aplikacji.

Platformy docelowe:

- Android

- iOS

Główne cele:

- bezpieczne ustawienia domyślne

- wysokiej jakości UI/UX

- łatwa w utrzymaniu architektura

- działanie w modelu offline-first

- przygotowanie pod przyszłą warstwę synchronizacji

- wyraźne rozdzielenie interfejsu użytkownika, logiki aplikacji, przechowywania danych, kryptografii i synchronizacji

W pierwszej wersji nie należy tworzyć backendu.

**---**

**# 2. Stos technologiczny**

Należy użyć:

- React Native

- TypeScript z włączonym trybem strict

- narzędzi Expo

- Expo Development Build zamiast polegania na Expo Go

- Expo Router do nawigacji

- Zustand do lekkiego zarządzania stanem aplikacji

- SQLite jako lokalnej bazy zaszyfrowanego sejfu

- platformowego Secure Storage / Keychain / Keystore do przechowywania niewielkich sekretów kryptograficznych

- sprawdzonych natywnych bibliotek kryptograficznych do szyfrowania i wyprowadzania kluczy

- React Native Reanimated do animacji tam, gdzie jest to przydatne

Należy preferować stabilne, aktywnie utrzymywane pakiety zgodne z aktualnym ekosystemem React Native / Expo.

Nie należy przypinać przestarzałych wersji pakietów tylko po to, aby dostosować projekt do starego poradnika.

**---**

**# 3. Krytyczne zasady bezpieczeństwa**

Jest to menedżer haseł. Bezpieczeństwo ma pierwszeństwo przed wygodą implementacji.

**## Nigdy nie należy robić poniższych rzeczy**

Nigdy nie należy:

- przechowywać haseł w postaci jawnej

- przechowywać hasła głównego

- przechowywać całego sejfu w AsyncStorage

- przechowywać kluczy szyfrujących w AsyncStorage

- logować danych logowania, odszyfrowanych sekretów, kluczy, tokenów ani haseł głównych

- tworzyć własnych algorytmów kryptograficznych

- używać odwracalnej obfuskacji jako szyfrowania

- używać zwykłego SHA-256 bezpośrednio jako KDF dla hasła

- wpisywać kluczy szyfrujących na stałe w kodzie

- wysyłać zawartości sejfu do zewnętrznych usług

- używać analityki, która może przechwytywać poufne pola

- pozostawiać odszyfrowanych danych sejfu niepotrzebnie zapisanych na dysku

- umieszczać realistycznie wyglądających danych logowania w produkcyjnych danych przykładowych

- commitować sekretów, plików podpisujących, sekretów `.env` ani wygenerowanych danych logowania

Wszystkie poufne wartości muszą być traktowane jako sekrety.

**---**

**# 4. Architektura kryptograficzna sejfu**

Należy zastosować warstwową architekturę kluczy.

Koncepcyjnie:

```text
Hasło główne
     |
     v
   Argon2id
     |
     v
Key Encryption Key (KEK)
     |
     v
odszyfrowuje
     |
     v
Vault Key
     |
     v
szyfruje/odszyfrowuje wpisy sejfu
```

**## Hasło główne**

Hasło główne użytkownika:

- nigdy nie może być przechowywane bezpośrednio

- może być wykorzystywane wyłącznie do wyprowadzania klucza

- powinno zostać usunięte ze stanu aplikacji tak szybko, jak jest to praktycznie możliwe po odblokowaniu

**## Wyprowadzanie klucza na podstawie hasła**

Należy użyć ****Argon2id**** za pośrednictwem dobrze utrzymywanej natywnej biblioteki kryptograficznej.

Razem z metadanymi sejfu należy przechowywać:

- sól

- parametry Argon2

- wersję KDF

Parametry należy zaprojektować w taki sposób, aby w przyszłości można było je aktualizować.

Przykładowy model metadanych:

```ts
type KdfMetadata = {
  algorithm: "argon2id";
  version: number;
  salt: string;
  memoryCost: number;
  iterations: number;
  parallelism: number;
};
```

Nie należy projektować architektury w sposób uniemożliwiający późniejsze aktualizacje KDF.

**## Klucz sejfu**

Należy wygenerować kryptograficznie bezpieczny losowy Vault Key.

Vault Key służy do szyfrowania danych sejfu użytkownika.

Sam Vault Key musi zostać zaszyfrowany/opakowany przy użyciu klucza wyprowadzonego z hasła głównego.

Zmiana hasła głównego powinna dzięki temu wymagać ponownego zaszyfrowania Vault Key, a nie każdego wpisu w sejfie.

**## Szyfrowanie danych**

Należy używać uwierzytelnionego algorytmu szyfrowania z zaufanej biblioteki.

Preferowane opcje:

- XChaCha20-Poly1305

- AES-256-GCM

Każdy zaszyfrowany rekord musi korzystać ze świeżego nonce/IV zgodnie z wymaganiami wybranego algorytmu.

Nigdy nie wolno ponownie używać tego samego nonce z tym samym kluczem szyfrującym.

Należy przechowywać:

```text
ciphertext
nonce
dane uwierzytelniające / metadane, jeśli są potrzebne
wersja kryptografii
```

Format przechowywania musi umożliwiać migracje kryptograficzne.

**---**

**# 5. Biometria**

Należy obsługiwać:

- Face ID na iOS, jeśli jest dostępne

- Touch ID, jeśli jest dostępne

- odcisk palca / obsługiwaną biometrię na Androidzie

Odblokowanie biometryczne nie może zastępować szyfrowania sejfu.

Zalecany przepływ:

```text
Hasło główne
   |
odblokowanie sejfu
   |
Vault Key
   |
opcjonalnie chroniony przez OS Keychain / Keystore
   |
uwierzytelnienie biometryczne kontroluje dostęp
```

Funkcja biometryczna powinna wykorzystywać mechanizmy bezpieczeństwa platformy.

Jeśli uwierzytelnianie biometryczne stanie się niedostępne lub ulegnie zmianie, zawsze musi istnieć możliwość powrotu do hasła głównego.

**---**

**# 6. Architektura offline-first**

Początkowa wersja musi działać bez:

- tworzenia konta

- dostępu do sieci

- backendu

- pamięci chmurowej

Należy utworzyć abstrakcję rozdzielającą przechowywanie danych od przyszłej synchronizacji.

Przykład:

```ts
interface SyncProvider {
  initialize(): Promise<void>;
  pushChanges(): Promise<void>;
  pullChanges(): Promise<void>;
  sync(): Promise<void>;
}
```

Początkowa implementacja:

```text
LocalOnlySyncProvider
```

Przyszła implementacja:

```text
EncryptedCloudSyncProvider
```

Interfejs aplikacji i serwisy sejfu nie powinny być bezpośrednio zależne od konkretnego dostawcy chmury.

**---**

**# 7. Sugerowana architektura aplikacji**

Należy zastosować wyraźne granice pomiędzy modułami.

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── onboarding/
│   ├── unlock/
│   ├── vault/
│   ├── entry/
│   ├── generator/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── vault/
│   ├── forms/
│   └── security/
│
├── features/
│   ├── onboarding/
│   ├── authentication/
│   ├── vault/
│   ├── password-generator/
│   └── settings/
│
├── services/
│   ├── VaultService.ts
│   ├── AuthService.ts
│   ├── ClipboardService.ts
│   ├── AutoLockService.ts
│   └── PasswordGeneratorService.ts
│
├── crypto/
│   ├── CryptoProvider.ts
│   ├── KeyDerivation.ts
│   ├── VaultEncryption.ts
│   ├── Random.ts
│   └── types.ts
│
├── database/
│   ├── database.ts
│   ├── migrations/
│   ├── repositories/
│   └── schema.ts
│
├── security/
│   ├── BiometricsService.ts
│   ├── SecureStorageService.ts
│   ├── ScreenSecurityService.ts
│   └── MemorySecurity.ts
│
├── sync/
│   ├── SyncProvider.ts
│   └── LocalOnlySyncProvider.ts
│
├── store/
│   ├── authStore.ts
│   ├── vaultStore.ts
│   └── settingsStore.ts
│
├── theme/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── theme.ts
│
├── types/
│   ├── VaultEntry.ts
│   ├── Category.ts
│   └── Settings.ts
│
└── utils/
```

Nie należy umieszczać całej logiki biznesowej wewnątrz komponentów React.

Komponenty React powinny odpowiadać przede wszystkim za prezentację oraz interakcję z użytkownikiem.

**---**

**# 8. Wzorzec Repository**

Pomiędzy serwisami a SQLite należy stosować repozytoria.

Przykład:

```ts
interface VaultRepository {
  getAll(): Promise<EncryptedVaultRecord[]>;
  getById(id: string): Promise<EncryptedVaultRecord | null>;
  insert(record: EncryptedVaultRecord): Promise<void>;
  update(record: EncryptedVaultRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Kod interfejsu użytkownika nie może wykonywać bezpośrednio surowych zapytań SQL.

**---**

**# 9. Model wpisu sejfu**

Odszyfrowany model znajdujący się w pamięci może wyglądać następująco:

```ts
export interface VaultEntry {
  id: string;
  type: "login";
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  favorite: boolean;
  categoryId?: string;
  createdAt: number;
  updatedAt: number;
}
```

Model należy zaprojektować tak, aby w przyszłości można było dodać kolejne typy wpisów:

- login

- bezpieczna notatka

- karta płatnicza

- tożsamość

- dane Wi-Fi

- licencja oprogramowania

Nie należy implementować wszystkich typów w MVP.

Należy rozpocząć od `login`.

**---**

**# 10. Baza danych**

Należy użyć SQLite.

System migracji należy utworzyć od samego początku.

Nie należy polegać na automatycznym odtwarzaniu schematu.

Sugerowane tabele:

```text
vault_metadata
vault_entries
categories
settings
schema_migrations
```

Możliwy sposób przechowywania zaszyfrowanego wpisu:

```text
vault_entries
id
type
encrypted_payload
nonce
crypto_version
created_at
updated_at
deleted_at
sync_version
```

Należy uwzględnić przyszłe wymagania związane z synchronizacją.

Należy dodać:

- stabilne identyfikatory UUID

- `updated_at`

- opcjonalne pole miękkiego usuwania

- pole wersji/revizji tam, gdzie jest to przydatne

Nie należy udostępniać poufnych pól jako osobnych kolumn tekstowych w postaci jawnej.

**---**

**# 11. Stany aplikacji**

Vaultly powinno jednoznacznie obsługiwać następujące stany:

```text
FIRST_LAUNCH
LOCKED
UNLOCKING
UNLOCKED
ERROR
```

Należy unikać niejednoznacznego stanu uwierzytelnienia.

Aplikacja musi blokować się w odpowiednich sytuacjach.

**---**

**# 12. Automatyczna blokada**

Należy zaimplementować konfigurowalną automatyczną blokadę.

Początkowe opcje:

- natychmiast

- po 30 sekundach

- po 1 minucie

- po 5 minutach

- po 15 minutach

Sejf należy zablokować, gdy aplikacja pozostaje w tle dłużej niż skonfigurowany limit czasu.

Po zablokowaniu sejfu należy:

- usunąć odszyfrowane dane sejfu ze store'ów Zustand

- usunąć odszyfrowane wpisy ze stanu UI

- usunąć aktywny materiał kryptograficzny ze zwykłego stanu aplikacji tam, gdzie jest to praktycznie możliwe

- powrócić do ekranu odblokowania

**---**

**# 13. Bezpieczeństwo schowka**

Należy umożliwić kopiowanie:

- nazwy użytkownika

- hasła

Hasła skopiowane do schowka powinny zostać automatycznie usunięte po konfigurowalnym czasie.

Sugerowane wartości:

- 30 sekund

- 60 sekund

- 90 sekund

- nigdy

Domyślna wartość powinna być bezpieczna, na przykład 30 sekund.

Nie należy umieszczać wartości hasła w treści komunikatów toast.

Poprawnie:

```text
Hasło skopiowane
```

Niepoprawnie:

```text
Hasło "MySecret123!" zostało skopiowane
```

**---**

**# 14. Ochrona przed zrzutami ekranu**

Tam, gdzie platforma na to pozwala, należy chronić ekrany wyświetlające poufne informacje.

Na Androidzie należy, jeśli jest to praktycznie możliwe, blokować zrzuty ekranu i nagrywanie ekranu dla wrażliwych widoków.

Na iOS należy zastosować najlepsze zgodne z platformą mechanizmy ochrony prywatności oraz ukrywać poufną zawartość aplikacji w przełączniku aplikacji.

Należy utworzyć do tego osobną abstrakcję zamiast rozrzucać natywne sprawdzenia po różnych ekranach.

**---**

**# 15. Generator haseł**

Należy zbudować bezpieczny generator haseł.

Należy używać kryptograficznie bezpiecznego źródła losowości.

Funkcje:

- konfigurowalna długość

- małe litery

- wielkie litery

- cyfry

- symbole

- możliwość wykluczenia niejednoznacznych znaków

- przycisk ponownego generowania

- przycisk kopiowania

Sugerowany zakres długości:

```text
8–128 znaków
```

Wartość domyślna:

```text
20 znaków
```

Do generowania haseł nie wolno używać `Math.random()`.

**---**

**# 16. Wyszukiwanie**

Wyszukiwanie powinno działać lokalnie.

Przeszukiwane pola mogą obejmować:

- nazwę wpisu

- nazwę użytkownika

- stronę internetową

- kategorię

Bezpieczeństwo jest ważniejsze niż agresywne indeksowanie.

Nie należy tworzyć indeksu wyszukiwania bazy danych zawierającego poufne hasła lub notatki w postaci jawnej.

Nigdy nie należy wyszukiwać na podstawie treści hasła.

**---**

**# 17. Funkcjonalność MVP**

Należy zaimplementować następujące MVP.

**## Onboarding**

Ekran 1:

```text
Logo Vaultly

Twoje hasła.

Chronione przez Ciebie.

[ Rozpocznij ]
```

Ekran 2:

Utworzenie hasła głównego.

Pola:

- hasło główne

- powtórzone hasło główne

Należy uwzględnić:

- wskaźnik siły hasła

- możliwość pokazania/ukrycia hasła

- jasne wyjaśnienie, że Vaultly nie może w prosty sposób odzyskać hasła głównego

Nie należy używać manipulacyjnych ani zastraszających komunikatów.

Ekran 3:

Konfiguracja biometrii.

Należy umożliwić:

```text
Włącz biometrię

Pomiń na razie
```

Ekran 4:

Potwierdzenie utworzenia sejfu.

**---**

**# 18. Ekran odblokowania**

Minimalistyczny interfejs klasy premium.

Należy wyświetlić:

- logo Vaultly

- pole hasła głównego

- przycisk odblokowania

- przycisk biometryczny, jeśli biometria została włączona

Przykład:

```text
              Vaultly

          Witaj ponownie

      [ Hasło główne ]

         [ Odblokuj ]

             lub

       [ Użyj Face ID ]
```

Podczas odblokowywania należy zastosować subtelną animację.

Nie należy ujawniać, czy częściowo wpisane hasło główne jest zbliżone do prawidłowego.

**---**

**# 19. Główny ekran sejfu**

Główny ekran powinien zawierać:

- powitanie / tytuł

- wyszukiwanie

- ulubione

- ostatnie lub wszystkie wpisy

- kategorie

- pływający przycisk dodawania

- dolną nawigację

Możliwa dolna nawigacja:

```text
Sejf

Generator

Ustawienia
```

Przykładowy kierunek wizualny:

```text
╭──────────────────────────────╮
│ Vaultly                  ◉   │
│                              │
│ Twój sejf                     │
│ 42 wpisy                      │
│                              │
│ ╭──────────────────────────╮ │
│ │ 🔎 Przeszukaj sejf       │ │
│ ╰──────────────────────────╯ │
│                              │
│ Ulubione                     │
│                              │
│ GitHub                       │
│ dawid@example.com            │
│                              │
│ Microsoft                    │
│ work@example.com             │
│                              │
│ Kategorie                    │
│ Osobiste              18     │
│ Praca                 16     │
│ Finanse                8     │
│                              │
│                     [ + ]    │
│                              │
│ Sejf   Generator Ustawienia  │
╰──────────────────────────────╯
```

Nie należy dokładnie kopiować wyglądu istniejącego komercyjnego menedżera haseł.

Vaultly powinno posiadać własną tożsamość.

**---**

**# 20. Ekran dodawania / edycji danych logowania**

Pola:

- nazwa

- nazwa użytkownika

- hasło

- URL

- kategoria

- ulubione

- notatki

Elementy sterujące polem hasła:

- pokaż/ukryj

- kopiuj

- generuj

Główna akcja:

```text
Zapisz
```

Edycja powinna zachowywać istniejący `id` oraz znacznik czasu utworzenia.

**---**

**# 21. Ekran szczegółów danych logowania**

Należy wyświetlić:

- ikonę usługi / monogram

- nazwę

- nazwę użytkownika

- zamaskowane hasło

- URL

- kategorię

- notatki

- znaczniki czasu tam, gdzie jest to przydatne

Akcje:

- kopiowanie nazwy użytkownika

- kopiowanie hasła

- pokazanie hasła

- edycja

- dodanie do ulubionych

- usunięcie

Usunięcie musi wymagać potwierdzenia.

Nie należy stosować przesadnie agresywnych okien potwierdzenia przy zwykłych, niedestrukcyjnych operacjach.

**---**

**# 22. Kategorie**

Początkowe wbudowane kategorie mogą obejmować:

- Osobiste

- Praca

- Finanse

- Społecznościowe

- Zakupy

- Inne

W przyszłości należy umożliwić użytkownikom tworzenie własnych kategorii.

Nie należy ściśle wiązać ikon ani kolorów z logiką kategorii.

**---**

**# 23. Ulubione**

Wpisy mogą być oznaczane jako ulubione.

Ulubione powinny pojawiać się w górnej części ekranu sejfu.

Jeśli jest to możliwe, status ulubionego wpisu nie powinien wymagać odszyfrowania niezwiązanych z nim rekordów.

Nie należy jednak osłabiać szyfrowania tylko po to, aby zoptymalizować obsługę ulubionych.

Bezpieczeństwo ma pierwszeństwo.

**---**

**# 24. Kierunek UI klasy premium**

Vaultly powinno wyglądać jak aplikacja klasy premium, a nie jak panel administracyjny CRUD.

Inspiracją mogą być:

- nowoczesne aplikacje fintech

- wysokiej jakości narzędzia produktywności

- dopracowane aplikacje bezpieczeństwa

- dyscyplina wizualna w stylu Linear

- stonowane efekty szkła

Nie należy jednak klonować żadnego istniejącego produktu.

Cechy wizualne:

- dużo przestrzeni

- duża, czysta typografia

- zaokrąglone karty

- subtelna głębia

- stonowane gradienty

- wysoki kontrast

- płynne przejścia

- subtelne informacje haptyczne

- eleganckie puste stany

- wysokiej jakości ikony

- dopracowane stany ładowania

- brak wizualnego chaosu

Preferowany zakres promienia zaokrąglenia:

```text
16–24 px
```

Należy używać scentralizowanej skali odstępów.

**---**

**# 25. System motywów**

Należy obsługiwać:

- motyw ciemny

- motyw jasny

- motyw systemowy

Tryb ciemny należy traktować jako pełnoprawny projekt, a nie jako późniejsze odwrócenie kolorów.

Należy utworzyć tokeny semantyczne:

```ts
background
surface
surfaceElevated
textPrimary
textSecondary
accent
danger
success
border
inputBackground
```

Komponenty powinny korzystać z tokenów semantycznych zamiast bezpośrednich wartości kolorów.

**---**

**# 26. Dostępność**

Należy obsługiwać:

- Dynamic Type / skalowanie czcionek tam, gdzie jest to praktyczne

- odpowiedni kontrast

- dostępne obszary dotykowe

- etykiety dla czytników ekranu

- jasne komunikaty walidacyjne

- formularze bezpieczne dla klawiatury

Nie należy polegać wyłącznie na kolorze podczas komunikowania stanu.

**---**

**# 27. Haptyka**

Należy stosować subtelne informacje haptyczne dla działań takich jak:

- odblokowanie sejfu

- poprawne zapisanie danych

- skopiowanie hasła

- ponowne wygenerowanie hasła

- potwierdzenie operacji destrukcyjnej

Nie należy nadużywać haptyki.

**---**

**# 28. Obsługa błędów**

Tam, gdzie jest to przydatne, należy tworzyć typowane błędy.

Przykłady:

```text
InvalidMasterPasswordError

VaultCorruptedError

CryptoVersionUnsupportedError

DatabaseMigrationError

BiometricUnavailableError
```

Błędy widoczne dla użytkownika powinny być zrozumiałe i nie ujawniać wewnętrznych szczegółów implementacji.

Nie należy wyświetlać użytkownikowi surowych wyjątków kryptograficznych.

**---**

**# 29. Logowanie**

Należy zaimplementować abstrakcję logowania.

Logi produkcyjne nigdy nie mogą zawierać:

- haseł

- haseł głównych

- odszyfrowanych notatek

- kluczy szyfrujących

- sekretów biometrycznych

- kompletnych danych sejfu

Należy używać kategorii logów takich jak:

```text
APP

DATABASE

VAULT

AUTH

CRYPTO

SYNC
```

Poufne pola muszą być maskowane.

**---**

**# 30. Testowanie**

Należy dodać testy dla kodu krytycznego z punktu widzenia bezpieczeństwa i działania aplikacji.

Minimalny zakres:

**## Testy jednostkowe**

- generator haseł

- wrapper KDF

- cykl szyfrowania/odszyfrowania

- obsługa nieprawidłowego ciphertext

- serializacja wpisów sejfu

- działanie repozytoriów

- obliczenia automatycznej blokady

- walidacja ustawień

**## Testy integracyjne**

- utworzenie sejfu

- zablokowanie sejfu

- odblokowanie sejfu

- zapisanie danych logowania

- ponowne załadowanie pamięci aplikacji

- odblokowanie i pobranie danych logowania

- edycja danych logowania

- usunięcie danych logowania

Funkcje związane z bezpieczeństwem nie mogą opierać się wyłącznie na testowaniu ręcznym.

**---**

**# 31. Jakość kodu**

Należy używać:

- TypeScript strict mode

- ESLint

- Prettier

- jasnego nazewnictwa

- małych, wyspecjalizowanych modułów

- dependency injection tam, gdzie poprawia to testowalność

Należy unikać:

- ogromnych plików

- komponentów React mających 1000 linii

- magicznych stałych

- zduplikowanej logiki kryptograficznej

- logiki biznesowej umieszczonej w JSX

- nadmiernego użycia `any`

- niebezpiecznych asercji typów

- niepotrzebnego globalnego stanu

Współdzielone interfejsy należy eksportować z dedykowanych modułów.

**---**

**# 32. Zarządzanie stanem**

Zustand należy wykorzystywać wyłącznie dla stanu aplikacji, który rzeczywiście musi być współdzielony.

Nie należy zapisywać odszyfrowanych wpisów sejfu na dysku za pomocą middleware Zustand.

Nie należy utrwalać kluczy szyfrujących za pomocą ogólnych mechanizmów persystencji stanu.

Poufny stan odblokowanej aplikacji powinien znajdować się wyłącznie w pamięci.

**---**

**# 33. Nawigacja**

Należy używać Expo Router.

Sugerowane ścieżki:

```text
/

├── onboarding/
│   ├── index
│   ├── create-master-password
│   ├── biometrics
│   └── complete
│
├── unlock/
│   └── index
│
├── (tabs)/
│   ├── vault
│   ├── generator
│   └── settings
│
└── entry/
    ├── new
    └── [id]
```

Guardy nawigacyjne muszą uniemożliwiać zablokowanym użytkownikom dostęp do ekranów zawierających odszyfrowane dane sejfu.

**---**

**# 34. Przyszła synchronizacja online**

Nie należy teraz implementować synchronizacji z chmurą.

Model danych należy jednak przygotować pod przyszłą zaszyfrowaną synchronizację.

Należy przyjąć, że przyszły serwer nigdy nie może otrzymywać sekretów sejfu w postaci jawnej.

Przyszły model koncepcyjny:

```text
Urządzenie
   |
szyfrowanie lokalne
   |
   v
Zaszyfrowane dane sejfu
   |
   v
Vaultly Sync API
   |
   v
Zaszyfrowana baza danych / object storage
```

Backend powinien przechowywać wyłącznie zaszyfrowane dane oraz metadane synchronizacji.

Potencjalne przyszłe możliwości:

- uwierzytelnianie konta

- wiele urządzeń

- szyfrowana synchronizacja sejfu

- rozwiązywanie konfliktów

- zarządzanie urządzeniami

- szyfrowane kopie zapasowe

- rotacja kluczy

- starannie zaprojektowane mechanizmy odzyskiwania

Nie należy wprowadzać zależności od serwera w MVP.

**---**

**# 35. Przyszłe typy wpisów**

Architekturę należy przygotować tak, aby w przyszłości można było dodać:

```text
Login

Bezpieczna notatka

Karta płatnicza

Tożsamość

Wi-Fi

Licencja oprogramowania

Klucz SSH

Dane API
```

Nie należy implementować zarządzania sekretami SSH/API, dopóki podstawowy model sejfu nie będzie stabilny.

**---**

**# 36. Przyszła integracja z przeglądarką / systemem**

Architektura powinna pozostać otwarta na:

- Android Autofill Service

- iOS Password AutoFill / credential provider extension

- rozszerzenie przeglądarki

- passkeys

- TOTP

- monitoring wycieków danych

- bezpieczne udostępnianie

Nie są to wymagania MVP.

**---**

**# 37. Przyszły import/eksport**

Przyszłe wersje mogą obsługiwać import z:

- Bitwarden

- KeePass

- 1Password

- CSV

Nigdy nie należy importować plików w postaci jawnej bez ostrzeżenia użytkownika, że takie pliki mogą pozostać zapisane na dysku.

Przyszły format szyfrowanych kopii zapasowych powinien być wersjonowany.

**---**

**# 38. Początkowy plan implementacji**

Projekt należy budować stopniowo.

**## Faza 1 — fundament**

Należy utworzyć:

- projekt

- konfigurację TypeScript

- linting / formatowanie

- Expo Router

- motyw

- wielokrotnego użytku podstawowe komponenty UI

- strukturę folderów

- inicjalizację SQLite

- system migracji

- interfejsy kryptograficzne

Aplikacja musi działać poprawnie przed przejściem dalej.

**## Faza 2 — tworzenie sejfu**

Należy zaimplementować:

- wykrywanie pierwszego uruchomienia

- onboarding

- tworzenie hasła głównego

- wyprowadzanie klucza Argon2id

- losowy Vault Key

- opakowywanie Vault Key

- przechowywanie metadanych sejfu

**## Faza 3 — odblokowywanie**

Należy zaimplementować:

- ekran odblokowania

- walidację hasła głównego

- odszyfrowanie Vault Key

- stan odblokowanej sesji

- operację blokowania

- automatyczną blokadę

**## Faza 4 — CRUD sejfu**

Należy zaimplementować:

- repozytorium

- serializację zaszyfrowanych wpisów

- dodawanie danych logowania

- wyświetlanie danych logowania

- edycję danych logowania

- usuwanie danych logowania

- ulubione

**## Faza 5 — generator**

Należy zaimplementować:

- bezpieczny generator losowych haseł

- interfejs generatora

- zabezpieczenia kopiowania

- limit czasu schowka

**## Faza 6 — biometria**

Należy zaimplementować:

- sprawdzanie dostępności biometrii

- konfigurację opt-in

- Secure Storage wspierane przez system operacyjny

- odblokowywanie biometryczne

- możliwość powrotu do hasła głównego

**## Faza 7 — dopracowanie**

Należy zaimplementować:

- przejścia

- haptykę

- skeleton states

- empty states

- dostępność

- motywy ciemny/jasny/systemowy

- prywatność w przełączniku aplikacji

- ochronę przed zrzutami ekranu tam, gdzie jest obsługiwana

**## Faza 8 — testy**

Należy dodać:

- testy jednostkowe

- testy repozytoriów

- testy kryptografii

- podstawowe przepływy integracyjne

**---**

**# 39. Pierwsze ekrany do zaimplementowania**

Pierwszy użyteczny przekrój aplikacji powinien wyglądać następująco:

```text
Uruchomienie
 |
 v
Onboarding
 |
 v
Utworzenie hasła głównego
 |
 v
Utworzenie sejfu
 |
 v
Ekran odblokowania
 |
 v
Pusty ekran główny sejfu
 |
 v
Dodanie danych logowania
 |
 v
Zaszyfrowany zapis
 |
 v
Dane logowania pojawiają się w sejfie
```

Nie należy rozpoczynać od synchronizacji z chmurą.

**---**

**# 40. Podstawowe komponenty UI**

Należy wcześnie utworzyć komponenty wielokrotnego użytku.

Przykłady:

```text
VaultlyButton

VaultlyInput

SecureInput

Card

Screen

Header

IconButton

EmptyState

SearchBar

BottomSheet

Toast

SectionHeader

PasswordStrengthMeter

CredentialRow

CategoryChip
```

Należy preferować komponenty, które można ze sobą swobodnie komponować.

Nie należy wprowadzać dużego zewnętrznego frameworka UI, chyba że wyraźnie poprawi on łatwość utrzymania projektu.

**---**

**# 41. Nazewnictwo**

Nazwa aplikacji:

```text
Vaultly
```

Nazwy `Vaultly` należy używać konsekwentnie w interfejsie oraz dokumentacji.

Sugerowane wewnętrzne identyfikatory:

```text
com.vaultly.app
```

Nie należy automatycznie publikować ani rejestrować zewnętrznych identyfikatorów.

**---**

**# 42. Kierunek brandingu**

Vaultly powinno sprawiać wrażenie aplikacji:

- prywatnej

- godnej zaufania

- nowoczesnej

- spokojnej

- premium

- szybkiej

Należy unikać:

- stereotypów związanych z hakerami

- estetyki neonowozielonego terminala

- nadmiernego używania symboli kłódek

- komunikatów opartych na strachu

- ogromnych tarcz bezpieczeństwa wszędzie w interfejsie

Możliwa koncepcja ikony:

```text
abstrakcyjne V + geometria sejfu/dziurki od klucza
```

Branding powinien pozostać minimalistyczny.

**---**

**# 43. Developer experience**

Należy dodać skrypty:

```text
start

android

ios

lint

typecheck

test

format
```

Proces konfiguracji należy udokumentować.

Przydatny README należy przygotować po uruchomieniu początkowej wersji aplikacji.

**---**

**# 44. Dokumentacja**

Należy dokumentować decyzje związane z bezpieczeństwem.

Minimalnie należy utworzyć:

```text
docs/
├── SECURITY_ARCHITECTURE.md
├── DATABASE.md
└── SYNC_FUTURE.md
```

Nie należy używać wprowadzających w błąd określeń takich jak:

```text
"szyfrowanie klasy wojskowej"

"100% nie do zhakowania"

"zero ryzyka"
```

Zamiast tego należy opisywać konkretne właściwości bezpieczeństwa.

**---**

**# 45. Definicja ukończenia MVP**

MVP uznaje się za ukończone, gdy użytkownik może:

1. zainstalować Vaultly

2. utworzyć sejf

3. wybrać silne hasło główne

4. odblokować sejf

5. opcjonalnie włączyć biometrię

6. utworzyć wpis logowania

7. bezpiecznie zapisać go w postaci zaszyfrowanej

8. zamknąć aplikację

9. ponownie otworzyć aplikację

10. odblokować sejf

11. pobrać dane logowania

12. edytować je

13. wygenerować nowe hasło

14. bezpiecznie kopiować dane logowania

15. usunąć wpis

16. skonfigurować automatyczną blokadę

17. korzystać z motywu ciemnego/jasnego/systemowego

Wszystkie przechowywane poufne dane logowania muszą pozostawać zaszyfrowane podczas przechowywania na urządzeniu.

**---**

**# 46. Zasady pracy Codex**

Podczas implementowania tego projektu:

1. Należy pracować stopniowo.

2. Po każdej istotnej zmianie aplikacja powinna pozostawać możliwa do uruchomienia.

3. Należy preferować bezpieczne i proste rozwiązania.

4. Zmiany wpływające na architekturę należy wyjaśniać w komentarzach kodu lub dokumentacji.

5. Nie należy po cichu osłabiać bezpieczeństwa tylko po to, aby uprościć implementację funkcji.

6. Nie należy wymyślać własnej kryptografii.

7. Nie należy jeszcze dodawać zależności od chmury.

8. Należy unikać przedwczesnych abstrakcji, z wyjątkiem sytuacji, w których chronią granice kryptografii, przechowywania danych lub przyszłej synchronizacji.

9. Należy dodawać testy dla logiki krytycznej z punktu widzenia bezpieczeństwa.

10. Nie należy ujawniać poufnych informacji w logach ani ekranach debugowania.

11. Przed dodaniem zależności należy sprawdzić, czy jest ona utrzymywana i odpowiednia dla React Native.

12. Tam, gdzie jest to możliwe, należy preferować mechanizmy bezpieczeństwa dostarczane przez platformę.

13. Odszyfrowane dane powinny znajdować się w pamięci przez możliwie najkrótszy praktyczny czas.

14. Migracje powinny być jawne i wersjonowane.

15. Należy zachować możliwość przyszłej zaszyfrowanej synchronizacji bez uzależniania MVP od serwera.

**---**

**# 47. Początkowe zadanie dla Codex**

Należy rozpocząć od zbudowania podstaw projektu Vaultly.

Pierwsza implementacja powinna zawierać:

- projekt React Native + TypeScript

- konfigurację gotową do Expo Development Build

- Expo Router

- strukturę folderów opisaną w tym dokumencie

- motyw jasny/ciemny/systemowy

- wielokrotnego użytku komponenty UI klasy premium

- inicjalizację bazy SQLite

- wersjonowane migracje bazy danych

- interfejsy dostawcy kryptografii

- abstrakcję bezpiecznej losowości

- abstrakcję Secure Storage

- stan blokady aplikacji

- ekrany onboardingu

- ekran tworzenia hasła głównego

- ekran odblokowania

- pusty ekran główny sejfu

Nie należy udawać działającego szyfrowania.

Jeżeli zależności kryptograficznej nie można jeszcze bezpiecznie zintegrować, należy utworzyć typowany interfejs i wyraźnie oznaczyć implementację jako nieukończoną zamiast zastępować ją niebezpiecznym szyfrowaniem tymczasowym.

Po tym etapie projekt musi się kompilować i uruchamiać.

Po ukończeniu fundamentów należy kontynuować implementację tworzenia sejfu oraz przepływu CRUD zaszyfrowanych danych logowania opisanego powyżej.
