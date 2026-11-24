# Architektura bezpieczeństwa

## Stan fundamentu

Projekt definiuje granice dla KDF, szyfrowania uwierzytelnionego, bezpiecznej losowości i Secure Storage. Produkcyjny provider używa natywnego Argon2id z parametrami 64 MiB / 3 iteracje / 1 wątek oraz AES-256-GCM z 96-bitowym nonce i 128-bitowym tagiem. Parametry KDF i wersja kryptografii są zapisane z sejfem, aby umożliwić migracje.

Hasło główne nie jest utrwalane. Ekrany przechowują je wyłącznie w lokalnym stanie formularza i czyszczą po operacji. Tekst jest kodowany bez normalizacji jako UTF-8, aby kolejne odblokowania zachowywały dokładną wartość wpisaną przez użytkownika.

`@sonnetstationsolutions/expo-argon2` jest młodą zależnością natywną. Pozostaje ukryta za `CryptoProvider`; przed wydaniem produkcyjnym wymagane są testy wektora Argon2 i pomiar parametrów na rzeczywistych urządzeniach z dolnej granicy wsparcia.

Docelowy przepływ: hasło główne → Argon2id → KEK → opakowany losowy Vault Key → szyfrowanie rekordów. Zmiana hasła wymaga wtedy ponownego opakowania Vault Key, a nie wszystkich rekordów.

## Zasady

- Odszyfrowane wpisy i aktywne klucze istnieją tylko w pamięci.
- Zustand nie używa persystencji dla sekretów.
- Logi nie mogą zawierać sekretów ani kompletnych rekordów.
- Secure Storage służy wyłącznie małym sekretom, nie całemu sejfowi.
- Każdy rekord otrzymuje świeży nonce; format zawiera wersję kryptografii.
