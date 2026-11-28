import type { SQLiteDatabase } from 'expo-sqlite';
import { ExpoCryptoProvider } from '@/crypto/ExpoCryptoProvider';
import { ExpoSecureRandom } from '@/crypto/Random';
import { SQLiteVaultMetadataRepository } from '@/database/repositories/SQLiteVaultMetadataRepository';
import { SQLiteVaultRepository } from '@/database/repositories/SQLiteVaultRepository';
import { VaultSession } from '@/security/VaultSession';
import { ExpoBiometricsService } from '@/security/BiometricsService';
import { BiometricVaultService } from '@/security/BiometricVaultService';
import { ExpoSecureStorageService } from '@/security/SecureStorageService';
import { DatabaseCipherService } from '@/database/DatabaseCipherService';
import { AuthService } from './AuthService';
import { AppDataResetService } from './AppDataResetService';
import { ExpoClipboardService } from './ClipboardService';
import { VaultService } from './VaultService';

const cryptoProvider = new ExpoCryptoProvider();
const secureRandom = new ExpoSecureRandom();
const secureStorage = new ExpoSecureStorageService();
export const databaseCipherService = new DatabaseCipherService(secureStorage);
export const vaultSession = new VaultSession(cryptoProvider);

export function initializeDatabaseCipher(db: SQLiteDatabase): Promise<void> {
  return databaseCipherService.initialize(db);
}

export function createAuthService(db: SQLiteDatabase): AuthService {
  return new AuthService(
    cryptoProvider,
    secureRandom,
    new SQLiteVaultMetadataRepository(db),
    vaultSession,
    db,
    databaseCipherService,
  );
}

export function createVaultService(db: SQLiteDatabase): VaultService {
  return new VaultService(new SQLiteVaultRepository(db), cryptoProvider, vaultSession);
}

export function createBiometricVaultService(): BiometricVaultService {
  return new BiometricVaultService(
    new ExpoBiometricsService(),
    secureStorage,
    vaultSession,
  );
}

export function createAppDataResetService(db: SQLiteDatabase): AppDataResetService {
  return new AppDataResetService(
    db,
    createBiometricVaultService(),
    vaultSession,
    new ExpoClipboardService(),
  );
}
