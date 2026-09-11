import { Readable } from 'stream';

export interface StorageUploadResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

export interface StorageProvider {
  upload(
    institutionId: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<StorageUploadResult>;
  read(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
