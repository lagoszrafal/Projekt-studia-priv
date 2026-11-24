import type { SyncProvider } from './SyncProvider';
export class LocalOnlySyncProvider implements SyncProvider {
  async initialize(): Promise<void> {}
  async pushChanges(): Promise<void> {}
  async pullChanges(): Promise<void> {}
  async sync(): Promise<void> {}
}
