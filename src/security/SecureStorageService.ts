import * as SecureStore from 'expo-secure-store';

export interface SecureStorageService {
  get(key: string, requireAuthentication?: boolean): Promise<string | null>;
  set(key: string, value: string, requireAuthentication?: boolean): Promise<void>;
  remove(key: string): Promise<void>;
}

export class ExpoSecureStorageService implements SecureStorageService {
  get(key: string, requireAuthentication = false): Promise<string | null> {
    return SecureStore.getItemAsync(key, {
      requireAuthentication,
      authenticationPrompt: 'Potwierdź tożsamość, aby odblokować sejf',
    });
  }
  set(key: string, value: string, requireAuthentication = false): Promise<void> {
    return SecureStore.setItemAsync(key, value, {
      requireAuthentication,
      authenticationPrompt: 'Potwierdź tożsamość, aby chronić sejf',
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  remove(key: string): Promise<void> { return SecureStore.deleteItemAsync(key); }
}
