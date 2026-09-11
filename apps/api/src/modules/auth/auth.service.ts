import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailProvider, EMAIL_PROVIDER } from './services/email';
import { UserStatus, InstitutionStatus, MembershipStatus } from '@prisma/client';
import { SelfRegisterDto } from './dto/self-register.dto';
import { GoogleProfile } from './strategies/google.strategy';

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

    const { newAccessToken, newRefreshToken } =
      await this.tokenService.rotateRefreshToken(refreshToken);

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
      message:
        'Si existe una cuenta asociada al correo indicado, recibirás instrucciones para restablecer tu contraseña.',
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

  async selfRegister(
    dto: SelfRegisterDto,
    ipAddress?: string,
  ): Promise<{ message: string; status: 'PENDING' }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const institution = dto.institutionId
      ? await this.prisma.institution.findUnique({ where: { id: dto.institutionId } })
      : await this.prisma.institution.findUnique({ where: { slug: dto.institutionSlug! } });

    if (!institution || institution.status !== InstitutionStatus.ACTIVE) {
      throw new NotFoundException('Institution not found');
    }

    if (dto.profile) {
      const hasType = dto.profile.documentType !== undefined && dto.profile.documentType !== null;
      const hasNumber =
        dto.profile.documentNumber !== undefined &&
        dto.profile.documentNumber !== null &&
        dto.profile.documentNumber.trim() !== '';
      if (hasType !== hasNumber) {
        throw new BadRequestException('documentType and documentNumber must be provided together');
      }
      if (hasType && hasNumber) {
        const docExists = await this.prisma.userProfile.findFirst({
          where: {
            institutionId: institution.id,
            documentType: dto.profile.documentType!,
            documentNumber: dto.profile.documentNumber!.trim(),
          },
          select: { id: true },
        });
        if (docExists) {
          throw new ConflictException('Document already registered in this institution');
        }
      }
    }

    const passwordValidation = this.passwordService.validatePasswordPolicy(dto.password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.error);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      const existingMembership = await this.prisma.userInstitution.findUnique({
        where: { userId_institutionId: { userId: existingUser.id, institutionId: institution.id } },
      });
      if (existingMembership && existingMembership.status !== MembershipStatus.REJECTED) {
        throw new ConflictException('A request or membership already exists for this institution');
      }

      let membershipId: string;
      if (existingMembership) {
        const updated = await this.prisma.userInstitution.update({
          where: { id: existingMembership.id },
          data: { status: MembershipStatus.PENDING, requestedRole: dto.requestedRole },
        });
        membershipId = updated.id;
      } else {
        const created = await this.prisma.userInstitution.create({
          data: {
            userId: existingUser.id,
            institutionId: institution.id,
            status: MembershipStatus.PENDING,
            requestedRole: dto.requestedRole,
          },
        });
        membershipId = created.id;
      }

      const linkedStudentId = await this.linkStudentAccount(
        institution.id,
        existingUser.id,
        dto.profile?.documentType,
        dto.profile?.documentNumber,
      );

      await this.auditService.log({
        userId: existingUser.id,
        institutionId: institution.id,
        action: 'SELF_REGISTER_REQUESTED',
        entityType: 'UserInstitution',
        entityId: membershipId,
        newValues: { requestedRole: dto.requestedRole, linkedStudentId },
        ipAddress,
      });

      return { message: 'Solicitud recibida. Quedará pendiente de aprobación.', status: 'PENDING' };
    }
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        status: UserStatus.INACTIVE,
        ...(dto.profile
          ? {
              profiles: {
                create: {
                  institutionId: institution.id,
                  documentType: dto.profile.documentType ?? null,
                  documentNumber: dto.profile.documentNumber
                    ? dto.profile.documentNumber.trim()
                    : null,
                  phone: dto.profile.phone ?? null,
                  address: dto.profile.address ?? null,
                  birthDate: dto.profile.birthDate ? new Date(dto.profile.birthDate) : null,
                  profession: dto.profile.profession ?? null,
                  bio: dto.profile.bio ?? null,
                },
              },
            }
          : {}),
      },
    });

    const linkedStudentId = await this.linkStudentAccount(
      institution.id,
      user.id,
      dto.profile?.documentType,
      dto.profile?.documentNumber,
    );

    const membership = await this.prisma.userInstitution.create({
      data: {
        userId: user.id,
        institutionId: institution.id,
        status: MembershipStatus.PENDING,
        requestedRole: dto.requestedRole,
      },
    });

    await this.auditService.log({
      userId: user.id,
      institutionId: institution.id,
      action: 'SELF_REGISTER_REQUESTED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      newValues: { requestedRole: dto.requestedRole, linkedStudentId },
      ipAddress,
    });

    return { message: 'Solicitud recibida. Quedará pendiente de aprobación.', status: 'PENDING' };
  }

  /**
   * Links an unclaimed Student record (same institution + exact document)
   * to the user's account so STUDENT-role users can access their own data.
   * Never reassigns an already-linked record.
   */
  private async linkStudentAccount(
    institutionId: string,
    userId: string,
    documentType?: string,
    documentNumber?: string,
  ): Promise<string | null> {
    const cleanNumber = documentNumber?.trim();
    if (!documentType || !cleanNumber) return null;

    const unclaimed = await this.prisma.student.findFirst({
      where: {
        institutionId,
        documentType: documentType as never,
        documentNumber: cleanNumber,
        userId: null,
      },
      select: { id: true },
    });
    if (!unclaimed) return null;

    await this.prisma.student.update({
      where: { id: unclaimed.id },
      data: { userId },
    });
    return unclaimed.id;
  }

  async loginWithGoogle(profile: GoogleProfile, ipAddress?: string): Promise<LoginResult> {
    if (!profile.email || !profile.emailVerified) {
      throw new ForbiddenException('Google account must have a verified email');
    }

    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
      select: { id: true, email: true, status: true },
    });

    if (byGoogleId) {
      if (byGoogleId.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await this.auditService.log({
        userId: byGoogleId.id,
        action: 'GOOGLE_LOGIN',
        entityType: 'User',
        entityId: byGoogleId.id,
        ipAddress,
      });
      return this.issueTokens(byGoogleId);
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, email: true, status: true, googleId: true },
    });

    if (!byEmail) {
      throw new ForbiddenException(
        'No account is linked to this Google identity. Request access first.',
      );
    }

    if (byEmail.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.googleId },
    });

    await this.auditService.log({
      userId: byEmail.id,
      action: 'GOOGLE_LINKED',
      entityType: 'User',
      entityId: byEmail.id,
      ipAddress,
    });

    return this.issueTokens({ id: byEmail.id, email: byEmail.email, status: byEmail.status });
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    status: UserStatus;
  }): Promise<LoginResult> {
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.tokenService.createRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, email: user.email, status: user.status },
      accessToken,
      refreshToken,
    };
  }
}
