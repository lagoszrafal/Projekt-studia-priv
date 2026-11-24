# Przyszła synchronizacja

MVP używa `LocalOnlySyncProvider` i nie wykonuje połączeń sieciowych. Warstwa UI ani serwisy sejfu nie zależą od dostawcy chmury.

Przyszły `EncryptedCloudSyncProvider` może przesyłać wyłącznie zaszyfrowane rekordy i minimalne metadane synchronizacji. Serwer nie może otrzymać hasła głównego, Vault Key ani odszyfrowanego payloadu.
