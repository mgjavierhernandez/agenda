import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma';

export interface AccessTokenPayload {
  sub: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly issuer = 'agenda-escolar-digital';
  private readonly audience = 'agenda-api';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  generateAccessToken(userId: string): string {
    const payload = {
      sub: userId,
      iss: this.issuer,
      aud: this.audience,
    };

    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');

    const options: JwtSignOptions = {
      expiresIn: expiresIn as StringValue,
    };

    return this.jwtService.sign(payload, options);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify(token);
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  hashRefreshTokenForStorage(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashRefreshTokenForStorage(token);
    const expiresInSeconds = this.parseDuration(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    const tokenHash = this.hashRefreshTokenForStorage(token);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });

    if (!storedToken) {
      return null;
    }

    if (storedToken.revokedAt) {
      return null;
    }

    if (storedToken.expiresAt < new Date()) {
      return null;
    }

    return { userId: storedToken.userId, tokenId: storedToken.id };
  }

  async rotateRefreshToken(oldToken: string): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    const validation = await this.validateRefreshToken(oldToken);

    if (!validation) {
      throw new Error('Invalid refresh token');
    }

    const { userId, tokenId } = validation;

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      }),
    ]);

    const newRefreshToken = this.generateRefreshToken();
    await this.createRefreshToken(userId, newRefreshToken);

    const newAccessToken = this.generateAccessToken(userId);

    return { newAccessToken, newRefreshToken };
  }

  async revokeRefreshToken(token: string): Promise<boolean> {
    const tokenHash = this.hashRefreshTokenForStorage(token);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, revokedAt: true },
    });

    if (!storedToken) {
      return false;
    }

    if (storedToken.revokedAt) {
      return true;
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return true;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
