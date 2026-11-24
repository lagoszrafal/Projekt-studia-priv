export interface VaultEntry {
  id: string; type: 'login'; name: string; username: string; password: string;
  url?: string; notes?: string; favorite: boolean; categoryId?: string;
  createdAt: number; updatedAt: number;
}
