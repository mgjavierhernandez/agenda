import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { STORAGE_PROVIDER } from './storage/tokens';
import { DevLocalStorageProvider } from './storage/dev-local-storage.provider';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    AuthModule,
    AuditModule,
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      useClass: DevLocalStorageProvider,
    },
  ],
  exports: [FilesService, STORAGE_PROVIDER],
})
export class FilesModule {}
