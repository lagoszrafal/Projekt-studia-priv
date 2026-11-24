export class InvalidMasterPasswordError extends Error {
  constructor() { super('Nie udało się odblokować sejfu.'); this.name = 'InvalidMasterPasswordError'; }
}
export class VaultCorruptedError extends Error {
  constructor() { super('Dane sejfu są uszkodzone lub niekompletne.'); this.name = 'VaultCorruptedError'; }
}
export class CryptoVersionUnsupportedError extends Error {
  constructor() { super('Ta wersja szyfrowania nie jest obsługiwana.'); this.name = 'CryptoVersionUnsupportedError'; }
}
export class DatabaseMigrationError extends Error {
  constructor() { super('Nie udało się przygotować lokalnej bazy danych.'); this.name = 'DatabaseMigrationError'; }
}
export class BiometricUnavailableError extends Error {
  constructor() { super('Uwierzytelnianie biometryczne jest niedostępne.'); this.name = 'BiometricUnavailableError'; }
}
