const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockUnlink = jest.fn().mockResolvedValue(undefined);
const mockAccess = jest.fn().mockResolvedValue(undefined);
const mockCreateReadStream = jest.fn();

jest.mock('fs', () => ({
  promises: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
    access: (...args: unknown[]) => mockAccess(...args),
  },
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

import { DevLocalStorageProvider } from './dev-local-storage.provider';

describe('DevLocalStorageProvider', () => {
  let provider: DevLocalStorageProvider;
  const storagePath = '/tmp/test-storage';

  beforeEach(() => {
    jest.clearAllMocks();
    const configMock = {
      get: jest.fn().mockReturnValue(storagePath),
    } as unknown as import('@nestjs/config').ConfigService;
    provider = new DevLocalStorageProvider(configMock);
  });

  describe('onModuleInit', () => {
    it('should create storage directory', async () => {
      await provider.onModuleInit();
      expect(mockMkdir).toHaveBeenCalledWith(storagePath, { recursive: true });
    });
  });

  describe('upload', () => {
    it('should upload file and return metadata', async () => {
      const result = await provider.upload(
        'inst-1',
        'test.pdf',
        'application/pdf',
        Buffer.from('hello'),
      );
      expect(result.storageKey).toContain('tenant/inst-1/files/');
      expect(result.storageKey).toContain('.pdf');
      expect(result.sizeBytes).toBe(5);
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('read', () => {
    it('should return a readable stream', async () => {
      const mockStream = { pipe: jest.fn() };
      mockCreateReadStream.mockReturnValue(mockStream);
      const result = await provider.read('tenant/inst-1/files/test.pdf');
      expect(result).toBe(mockStream);
      expect(mockCreateReadStream).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      await provider.delete('tenant/inst-1/files/test.pdf');
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should not throw if file already deleted', async () => {
      mockUnlink.mockRejectedValueOnce(new Error('ENOENT'));
      await expect(provider.delete('tenant/inst-1/files/test.pdf')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const result = await provider.exists('tenant/inst-1/files/test.pdf');
      expect(result).toBe(true);
    });

    it('should return false for missing file', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      const result = await provider.exists('tenant/inst-1/files/test.pdf');
      expect(result).toBe(false);
    });
  });

  describe('path traversal prevention', () => {
    it('should reject paths with traversal in read', async () => {
      await expect(provider.read('../../etc/passwd')).rejects.toThrow('Path traversal detected');
    });

    it('should reject paths with traversal in delete', async () => {
      await expect(provider.delete('../../etc/passwd')).rejects.toThrow('Path traversal detected');
    });

    it('should return false for paths with traversal in exists', async () => {
      const result = await provider.exists('../../etc/passwd');
      expect(result).toBe(false);
    });
  });
});
