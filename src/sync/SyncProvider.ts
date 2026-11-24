export interface SyncProvider {
  initialize(): Promise<void>; pushChanges(): Promise<void>; pullChanges(): Promise<void>; sync(): Promise<void>;
}
