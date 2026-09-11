import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService, AuthUser, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-recovery.dto';
import { SelfRegisterDto } from './dto/self-register.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleStrategy, GoogleProfile } from './strategies/google.strategy';
import { TenantContextGuard, AuthenticatedRequest } from './tenant/tenant-context.guard';
import { TenantContextService } from './tenant/tenant-context.service';
import { AuthorizationService } from './authorization/authorization.service';
import { RequirePermission } from './authorization/require-permission.decorator';
import { PermissionGuard } from './authorization/permission.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantContextService: TenantContextService,
    private readonly authorizationService: AuthorizationService,
    private readonly configService: ConfigService,
  ) {}

  private assertGoogleConfigured(): void {
    if (!GoogleStrategy.isConfigured(this.configService)) {
      throw new ServiceUnavailableException('Google authentication is not configured');
    }
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful - returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @Post('login')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @ApiOperation({
    summary: 'Public self-registration (creates a PENDING membership, no access granted)',
  })
  @ApiResponse({ status: 201, description: 'Request received, pending approval' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @ApiResponse({ status: 409, description: 'Request or membership already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @Post('self-register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  async selfRegister(
    @Body() dto: SelfRegisterDto,
    @Request() req: { ip?: string },
  ): Promise<{ message: string; status: 'PENDING' }> {
    return this.authService.selfRegister(dto, req.ip);
  }

  @ApiOperation({ summary: 'Start Google OAuth login (redirects to Google)' })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent screen' })
  @ApiResponse({ status: 503, description: 'Google authentication is not configured' })
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(): Promise<void> {
    this.assertGoogleConfigured();
  }

  @ApiOperation({ summary: 'Google OAuth callback (issues the standard JWT scheme)' })
  @ApiResponse({ status: 200, description: 'Login successful - returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Account not active' })
  @ApiResponse({ status: 403, description: 'No linked account - request access first' })
  @ApiResponse({ status: 503, description: 'Google authentication is not configured' })
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleCallback(@Request() req: { user: GoogleProfile; ip?: string }): Promise<LoginResult> {
    this.assertGoogleConfigured();
    return this.authService.loginWithGoogle(req.user, req.ip);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshDto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(refreshDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'If account exists, reset email sent' })
  @Post('forgot-password')
  @Throttle({ default: { limit: 100, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Post('reset-password')
  @Throttle({ default: { limit: 100, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<AuthUser> {
    return this.authService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'List user institutions' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'List of institutions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AccessTokenGuard)
  @Get('institutions')
  async getInstitutions(@Request() req: AuthenticatedRequest) {
    const institutions = await this.tenantContextService.getUserInstitutions(req.user.userId);
    return { institutions };
  }

  @ApiOperation({ summary: 'Select active tenant institution' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Tenant selected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AccessTokenGuard)
  @Post('tenant/select')
  @HttpCode(HttpStatus.OK)
  async selectTenant(
    @Request() req: AuthenticatedRequest,
    @Body() selectTenantDto: SelectTenantDto,
  ) {
    return this.tenantContextService.getInstitutionForContext(
      req.user.userId,
      selectTenantDto.institutionId,
    );
  }

  @ApiOperation({ summary: 'Get current tenant context' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Current tenant info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AccessTokenGuard, TenantContextGuard)
  @Get('tenant')
  async getTenant(@Request() req: AuthenticatedRequest) {
    if (!req.tenant) {
      return { institution: null, membership: null };
    }

    return this.tenantContextService.getInstitutionForContext(
      req.user.userId,
      req.tenant.institutionId,
    );
  }

  @ApiOperation({ summary: 'Get current user effective permissions for tenant' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'User permissions for current tenant context' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AccessTokenGuard, TenantContextGuard)
  @Get('my-permissions')
  async getMyPermissions(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const institutionId = req.tenant?.institutionId;

    let permissions: string[];
    if (institutionId) {
      permissions = await this.authorizationService.getUserPermissionCodes(userId, institutionId);
    } else {
      permissions = await this.authorizationService.getGlobalPermissionCodes(userId);
    }

    return { permissions };
  }

  @ApiOperation({ summary: 'Verify current user authorization for tenant' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Authorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
  @RequirePermission('institution:read')
  @Get('authorization-check')
  async authorizationCheck(@Request() req: AuthenticatedRequest) {
    return {
      authorized: true,
      institutionId: req.tenant?.institutionId,
    };
  }
}
