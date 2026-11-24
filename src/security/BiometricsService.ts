import {
  SecurityLevel,
  authenticateAsync,
  getEnrolledLevelAsync,
  hasHardwareAsync,
} from 'expo-local-authentication';
import { BiometricUnavailableError } from '@/utils/errors';

export interface BiometricsService {
  isAvailable(): Promise<boolean>;
  authenticate(): Promise<boolean>;
}

export class ExpoBiometricsService implements BiometricsService {
  async isAvailable(): Promise<boolean> {
    const hardware = await hasHardwareAsync();
    if (!hardware) return false;

    const level = await getEnrolledLevelAsync();
    return level === SecurityLevel.BIOMETRIC_STRONG;
  }

  async authenticate(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available) {
      throw new BiometricUnavailableError();
    }

    const result = await authenticateAsync({
      promptMessage: 'Potwierdź tożsamość, aby odblokować sejf',
      fallbackLabel: 'Użyj hasła głównego',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });

    return result.success;
  }
}
