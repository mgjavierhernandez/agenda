import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { StorageProvider, StorageUploadResult } from '../interfaces/storage-provider.interface';

@Injectable()
export class DevLocalStorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(DevLocalStorageProvider.name);
  private storagePath: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath = this.configService.get<string>('FILE_STORAGE_PATH', './storage');
  }

  async onModuleInit(): Promise<void> {
    await fs.promises.mkdir(this.storagePath, { recursive: true });
    this.logger.log(`Local storage initialized at: ${this.storagePath}`);
  }

  private sanitizePath(storageKey: string): string {
    const resolved = path.resolve(this.storagePath, storageKey);
    const storageRoot = path.resolve(this.storagePath);
    if (!resolved.startsWith(storageRoot)) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  }

  async upload(
    institutionId: string,
    originalName: string,
    _mimeType: string,
    buffer: Buffer,
  ): Promise<StorageUploadResult> {
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(originalName);
    const uniqueName = `${randomBytes(16).toString('hex')}${ext}`;
    const storageKey = `tenant/${institutionId}/files/${uniqueName}`;
    const physicalPath = this.sanitizePath(storageKey);

    await fs.promises.mkdir(path.dirname(physicalPath), { recursive: true });
    await fs.promises.writeFile(physicalPath, buffer);

    return {
      storageKey,
      sizeBytes: buffer.length,
      checksum,
    };
  }

  async read(storageKey: string): Promise<Readable> {
    const physicalPath = this.sanitizePath(storageKey);
    const stream = fs.createReadStream(physicalPath);
    return stream;
  }

  async delete(storageKey: string): Promise<void> {
    const physicalPath = this.sanitizePath(storageKey);
    try {
      await fs.promises.unlink(physicalPath);
    } catch {
      // File may already be deleted; ignore
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      const physicalPath = this.sanitizePath(storageKey);
      await fs.promises.access(physicalPath);
      return true;
    } catch {
      return false;
    }
  }
}
