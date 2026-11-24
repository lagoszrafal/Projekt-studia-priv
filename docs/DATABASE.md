# Baza danych

Vaultly używa `expo-sqlite`. Przy otwarciu włącza WAL i klucze obce, a następnie stosuje jawne migracje w transakcji. Wersje zapisuje tabela `schema_migrations`.

Pierwsza migracja tworzy `vault_metadata`, `vault_entries`, `categories` i `settings`. Druga dodaje osobny tag uwierzytelniający opakowanego Vault Key. Poufne pola wpisu nie mają osobnych kolumn tekstowych: rekord zawiera `encrypted_payload`, nonce, opcjonalny tag uwierzytelniający i wersję kryptografii. `deleted_at` oraz `sync_version` przygotowują model pod przyszłą synchronizację.

SQLite nie jest szyfrowany jako całość. Poufność rekordów zapewnia szyfrowanie AES-256-GCM na poziomie aplikacji. Do SQL należy przekazywać dane przez parametry zapytań.
