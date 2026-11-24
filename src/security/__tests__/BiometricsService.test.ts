import {
  SecurityLevel,
  authenticateAsync,
  getEnrolledLevelAsync,
  hasHardwareAsync,
} from 'expo-local-authentication';
import { ExpoBiometricsService } from '../BiometricsService';

jest.mock('expo-local-authentication', () => ({
  __esModule: true,
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
  hasHardwareAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

describe('ExpoBiometricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when no biometric method is enrolled', async () => {
    (hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (getEnrolledLevelAsync as jest.Mock).mockResolvedValue(SecurityLevel.NONE);

    const service = new ExpoBiometricsService();

    await expect(service.isAvailable()).resolves.toBe(false);
  });

  it('odrzuca słabą biometrię', async () => {
    (hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (getEnrolledLevelAsync as jest.Mock).mockResolvedValue(SecurityLevel.BIOMETRIC_WEAK);

    await expect(new ExpoBiometricsService().isAvailable()).resolves.toBe(false);
  });

  it('returns true when authentication succeeds', async () => {
    (hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (getEnrolledLevelAsync as jest.Mock).mockResolvedValue(SecurityLevel.BIOMETRIC_STRONG);
    (authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    const service = new ExpoBiometricsService();

    await expect(service.authenticate()).resolves.toBe(true);
    expect(authenticateAsync).toHaveBeenCalledWith(expect.objectContaining({
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: true,
    }));
  });
});
