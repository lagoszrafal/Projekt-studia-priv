# Baza danych

Vaultly używa `expo-sqlite`. Przy otwarciu włącza WAL i klucze obce, a następnie stosuje jawne migracje w transakcji. Wersje zapisuje tabela `schema_migrations`.

Pierwsza migracja tworzy `vault_metadata`, `vault_entries`, `categories` i `settings`. Druga dodaje osobny tag uwierzytelniający opakowanego Vault Key. Poufne pola wpisu nie mają osobnych kolumn tekstowych: rekord zawiera `encrypted_payload`, nonce, opcjonalny tag uwierzytelniający i wersję kryptografii. `deleted_at` oraz `sync_version` przygotowują model pod przyszłą synchronizację.

SQLite używa SQLCipher do szyfrowania całej bazy. Klucz SQLCipher jest wyprowadzany z hasła głównego przez Argon2id i przechowywany w systemowym SecureStore, aby aplikacja mogła otworzyć bazę przed ekranem odblokowania. Poufne pola nadal mają dodatkowe szyfrowanie AES-256-GCM na poziomie aplikacji. Do SQL należy przekazywać dane przez parametry zapytań.

## Eksport kopii

Opcja **Ustawienia → Kopia zapasowa** tworzy plik `.vaultly` i udostępnia go przez systemowe menu udostępniania. Plik zawiera zaszyfrowaną kopię bazy SQLCipher oraz jawne parametry KDF (algorytm, sól i parametry Argon2id), ale nie zawiera klucza ani hasła. Hasło główne jest wymagane do wyprowadzenia klucza.

Podczas pierwszej konfiguracji można wybrać **Przywróć kopię zapasową**, wskazać plik `.vaultly` i podać hasło główne. Aplikacja weryfikuje kopię i hasło przed zapisaniem jej do lokalnej bazy. Import jest dostępny wyłącznie, gdy lokalny sejf nie istnieje. Starsze pliki `.db` nie zawierają parametrów KDF i nie są przenośne; należy utworzyć nową kopię `.vaultly`.

Przy pierwszym odblokowaniu po aktualizacji istniejąca baza SQLite jest szyfrowana w miejscu po uprzednim zweryfikowaniu hasła głównego.
