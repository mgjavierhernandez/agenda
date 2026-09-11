import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FilesService, MAX_TASK_ATTACHMENTS } from './files.service';
import { FileAssetStatus } from '@prisma/client';

type MockFn = jest.Mock;

interface MockModel {
  create: MockFn;
  findFirst: MockFn;
  findUnique: MockFn;
  update: MockFn;
  delete: MockFn;
  count: MockFn;
  findMany: MockFn;
}

function mockModel(methods: Partial<Record<keyof MockModel, MockFn>> = {}): MockModel {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    ...methods,
  };
}

describe('FilesService', () => {
  let service: FilesService;
  let prismaMock: Record<string, MockModel>;
  let auditMock: { log: MockFn; prisma: MockFn };
  let storageMock: { upload: MockFn; delete: MockFn; read: MockFn; exists: MockFn };
  let configMock: { get: MockFn };

  beforeEach(() => {
    prismaMock = {
      fileAsset: mockModel(),
      task: mockModel({ findFirst: jest.fn() }),
      taskAttachment: mockModel(),
      communication: mockModel({ findFirst: jest.fn() }),
      communicationAttachment: mockModel(),
    };
    auditMock = { log: jest.fn(), prisma: jest.fn() };
    storageMock = {
      upload: jest.fn().mockResolvedValue({
        storageKey: 'tenant/inst-1/files/abc.pdf',
        sizeBytes: 1024,
        checksum: 'abc123',
      }),
      delete: jest.fn(),
      read: jest.fn(),
      exists: jest.fn(),
    };
    configMock = {
      get: jest.fn((_key: string, defaultVal: unknown) => defaultVal),
    };
    service = new FilesService(
      prismaMock as never,
      auditMock as never,
      storageMock as never,
      configMock as never,
    );
  });

  describe('uploadFile', () => {
    it('should upload a valid file', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 4,
      } as Express.Multer.File;
      prismaMock.fileAsset.create.mockResolvedValue({ id: 'file-1', originalName: 'test.pdf' });
      const result = await service.uploadFile('inst-1', 'user-1', file);
      expect(result.id).toBe('file-1');
      expect(storageMock.upload).toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalled();
    });

    it('should reject empty files', async () => {
      const file = {
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 0,
      } as unknown as Express.Multer.File;
      await expect(service.uploadFile('inst-1', 'user-1', file)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject oversized files', async () => {
      const file = {
        originalname: 'big.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(11 * 1024 * 1024),
        size: 11 * 1024 * 1024,
      } as unknown as Express.Multer.File;
      await expect(service.uploadFile('inst-1', 'user-1', file)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject disallowed MIME types', async () => {
      const file = {
        originalname: 'evil.exe',
        mimetype: 'application/x-executable',
        buffer: Buffer.from('x'),
        size: 1,
      } as unknown as Express.Multer.File;
      await expect(service.uploadFile('inst-1', 'user-1', file)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a file asset', async () => {
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      const result = await service.findOne('inst-1', 'file-1');
      expect(result.id).toBe('file-1');
    });

    it('should throw if not found', async () => {
      prismaMock.fileAsset.findFirst.mockResolvedValue(null);
      await expect(service.findOne('inst-1', 'file-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('should soft-delete when file has task attachments', async () => {
      prismaMock.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        originalName: 'test.pdf',
        storageKey: 'key',
      });
      prismaMock.taskAttachment.findFirst.mockResolvedValue({ id: 'att-1' });
      prismaMock.communicationAttachment.findFirst.mockResolvedValue(null);
      await service.deleteFile('inst-1', 'file-1', 'user-1');
      expect(prismaMock.fileAsset.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { status: FileAssetStatus.DELETED },
      });
      expect(storageMock.delete).not.toHaveBeenCalled();
    });

    it('should hard-delete when file has no attachments', async () => {
      prismaMock.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        originalName: 'test.pdf',
        storageKey: 'key',
      });
      prismaMock.taskAttachment.findFirst.mockResolvedValue(null);
      prismaMock.communicationAttachment.findFirst.mockResolvedValue(null);
      await service.deleteFile('inst-1', 'file-1', 'user-1');
      expect(prismaMock.fileAsset.delete).toHaveBeenCalled();
      expect(storageMock.delete).toHaveBeenCalledWith('key');
    });
  });

  describe('createTaskAttachment', () => {
    it('should create a task attachment', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: 'task-1' });
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      prismaMock.taskAttachment.count.mockResolvedValue(0);
      prismaMock.taskAttachment.findUnique.mockResolvedValue(null);
      prismaMock.taskAttachment.create.mockResolvedValue({
        id: 'att-1',
        fileAsset: { originalName: 'test.pdf' },
      });
      const result = await service.createTaskAttachment('inst-1', 'task-1', 'file-1', 'user-1');
      expect(result.id).toBe('att-1');
    });

    it('should throw if task not found', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);
      await expect(
        service.createTaskAttachment('inst-1', 'task-1', 'file-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on duplicate attachment', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: 'task-1' });
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      prismaMock.taskAttachment.count.mockResolvedValue(0);
      prismaMock.taskAttachment.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createTaskAttachment('inst-1', 'task-1', 'file-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when attachment limit exceeded', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: 'task-1' });
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      prismaMock.taskAttachment.count.mockResolvedValue(MAX_TASK_ATTACHMENTS);
      await expect(
        service.createTaskAttachment('inst-1', 'task-1', 'file-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTaskAttachment', () => {
    it('should delete attachment and clean up orphan file', async () => {
      prismaMock.taskAttachment.findFirst.mockResolvedValue({
        id: 'att-1',
        fileAssetId: 'file-1',
        fileAsset: { storageKey: 'key', originalName: 'test.pdf' },
      });
      prismaMock.taskAttachment.delete.mockResolvedValue({});
      prismaMock.taskAttachment.count.mockResolvedValue(0);
      prismaMock.communicationAttachment.count.mockResolvedValue(0);
      prismaMock.fileAsset.delete.mockResolvedValue({});
      await service.deleteTaskAttachment('inst-1', 'task-1', 'att-1', 'user-1');
      expect(storageMock.delete).toHaveBeenCalledWith('key');
    });

    it('should not delete file when other references exist', async () => {
      prismaMock.taskAttachment.findFirst.mockResolvedValue({
        id: 'att-1',
        fileAssetId: 'file-1',
        fileAsset: { storageKey: 'key', originalName: 'test.pdf' },
      });
      prismaMock.taskAttachment.delete.mockResolvedValue({});
      prismaMock.taskAttachment.count.mockResolvedValue(1);
      prismaMock.communicationAttachment.count.mockResolvedValue(0);
      await service.deleteTaskAttachment('inst-1', 'task-1', 'att-1', 'user-1');
      expect(storageMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('createCommunicationAttachment', () => {
    it('should create a communication attachment', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({ id: 'comm-1' });
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      prismaMock.communicationAttachment.count.mockResolvedValue(0);
      prismaMock.communicationAttachment.findUnique.mockResolvedValue(null);
      prismaMock.communicationAttachment.create.mockResolvedValue({
        id: 'att-1',
        fileAsset: { originalName: 'test.pdf' },
      });
      const result = await service.createCommunicationAttachment(
        'inst-1',
        'comm-1',
        'file-1',
        'user-1',
      );
      expect(result.id).toBe('att-1');
    });

    it('should throw if communication not found', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.createCommunicationAttachment('inst-1', 'comm-1', 'file-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on duplicate', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({ id: 'comm-1' });
      prismaMock.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
      prismaMock.communicationAttachment.count.mockResolvedValue(0);
      prismaMock.communicationAttachment.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createCommunicationAttachment('inst-1', 'comm-1', 'file-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
