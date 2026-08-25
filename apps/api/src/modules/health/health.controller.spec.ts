import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../common/prisma';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaMock: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaMock = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /health', () => {
    it('should return status ok with timestamp and uptime', () => {
      const result = controller.getHealth();
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('GET /health/readiness', () => {
    it('should return ok when database is reachable', async () => {
      const result = await controller.getReadiness();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
    });

    it('should return error when database is unreachable', async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await controller.getReadiness();
      expect(result.status).toBe('error');
      expect(result.database).toBe('error');
    });
  });
});
