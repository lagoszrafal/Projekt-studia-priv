import { setStringAsync } from 'expo-clipboard';
import { ExpoClipboardService } from '../ClipboardService';

jest.mock('expo-clipboard', () => ({
  __esModule: true,
  setStringAsync: jest.fn(),
}));

describe('ExpoClipboardService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('copies value to clipboard and clears it after the configured delay', async () => {
    const service = new ExpoClipboardService();

    await service.copySecret('secret-pass', 30);

    expect(setStringAsync).toHaveBeenCalledWith('secret-pass');

    jest.advanceTimersByTime(30_000);

    expect(setStringAsync).toHaveBeenLastCalledWith('');
  });

  it('keeps value in clipboard when clearAfterSeconds is null', async () => {
    const service = new ExpoClipboardService();

    await service.copySecret('secret-pass', null);

    expect(setStringAsync).toHaveBeenCalledWith('secret-pass');
    jest.advanceTimersByTime(60_000);
    expect(setStringAsync).toHaveBeenCalledTimes(1);
  });
});
