import { Injectable, Inject, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailProvider, EMAIL_PROVIDER } from './services/email';
import { UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  status: UserStatus;
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly resetTokenExpiresMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.resetTokenExpiresMinutes = parseInt(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_EXPIRES_MINUTES', '60'),
      10,
    );
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.tokenService.createRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const validation = await this.tokenService.validateRefreshToken(refreshToken);

    if (!validation) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { newAccessToken, newRefreshToken } = await this.tokenService.rotateRefreshToken(refreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, status: true },
    });

    if (user && user.status === UserStatus.ACTIVE) {
      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const expiresAt = new Date(Date.now() + this.resetTokenExpiresMinutes * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.emailProvider.sendPasswordReset({
        to: user.email,
        resetToken: rawToken,
        expiresInMinutes: this.resetTokenExpiresMinutes,
      });

      await this.auditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
      });
    }

    return {
      message: 'Si existe una cuenta asociada al correo indicado, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { id: true, status: true } },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordValidation = this.passwordService.validatePasswordPolicy(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.error);
    }

    const newPasswordHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id },
        },
        data: { usedAt: new Date() },
      });

      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: resetToken.userId,
        },
      });
    });

    return { message: 'Password has been reset successfully' };
  }
}