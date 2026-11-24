import { setStringAsync } from 'expo-clipboard';

export interface ClipboardService {
  copySecret(value: string, clearAfterSeconds: number | null): Promise<void>;
  clear(): Promise<void>;
}

export class ExpoClipboardService implements ClipboardService {
  async clear(): Promise<void> {
    await setStringAsync('');
  }

  async copySecret(value: string, clearAfterSeconds: number | null): Promise<void> {
    await setStringAsync(value);

    if (clearAfterSeconds === null) return;

    setTimeout(async () => {
      await this.clear();
    }, clearAfterSeconds * 1000);
  }
}
