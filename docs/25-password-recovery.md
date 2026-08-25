# 25 - Recuperacion de Contrasena

Flujo de recuperacion de contrasena basado en tokens de un solo uso con expiracion configurable. El usuario solicita un restablecimiento, recibe un token por email, y lo canjea para establecer una nueva contrasena. Los tokens se almacenan como hashes SHA-256 y nunca se guardan en texto plano.

---
## Endpoints

| Metodo | Endpoint | Body | Descripcion |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/forgot-password` | `{ email }` | Solicita token de restablecimiento |
| POST | `/api/v1/auth/reset-password` | `{ token, newPassword }` | Restablece la contrasena |

### POST /api/v1/auth/forgot-password
**Request:** `{ "email": "usuario@example.com" }`
**Response (200):** `{ "message": "Si existe una cuenta asociada al correo indicado, recibiras instrucciones para restablecer tu contrasena." }`
Siempre retorna 200 con el mismo mensaje, independientemente de si el email existe o no. Esto previene enumeracion de usuarios.

### POST /api/v1/auth/reset-password
**Request:** `{ "token": "base64url-token", "newPassword": "nueva_contrasena" }`
**Response (200):** `{ "message": "Password has been reset successfully" }`
**Response Error (400):** `{ "statusCode": 400, "message": "Invalid or expired reset token" }`

## Flujo

```
Usuario -> POST /forgot-password { email }
  | Buscar usuario por email (normalizado)
  | Si no existe o no esta ACTIVE: retornar mensaje generico
  | Generar token aleatorio (crypto.randomBytes(32), base64url)
  | Calcular SHA-256(token) -> tokenHash
  | Invalidar tokens previos del usuario (marcar usedAt)
  | Crear PasswordResetToken con expiracion configurable
  | Enviar email con token crudo via EmailProvider
  | Registrar en AuditLog: PASSWORD_RESET_REQUESTED
  v Responder: mensaje generico

Usuario recibe email con enlace que contiene el token crudo

Usuario -> POST /reset-password { token, newPassword }
  | Calcular SHA-256(token) -> tokenHash
  | Buscar PasswordResetToken por tokenHash
  | Verificar: existe, no usado, no expirado, usuario ACTIVE
  | Validar politica de contrasena (min 8, max 128)
  | Ejecutar transaccion:
  |   - Actualizar passwordHash del usuario
  |   - Marcar token como usado
  |   - Invalidar tokens pendientes del usuario
  |   - Revocar todos los refresh tokens del usuario
  |   - Registrar en AuditLog: PASSWORD_RESET_COMPLETED
  v Responder: exito
```

## Medidas de Seguridad

| Medida | Descripcion |
|--------|-------------|
| SHA-256 hashing | El token nunca se almacena en texto plano. Se guarda SHA-256(token) en `tokenHash`. |
| Expiracion configurable | Default 60 min. Configurable via `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES`. |
| Uso unico | El token se marca como usado (`usedAt`) despues del restablecimiento. |
| Anti-enumeracion | `forgot-password` siempre retorna 200 con el mismo mensaje. |
| Invalidacion previa | Nueva solicitud invalida todos los tokens pendientes anteriores del usuario. |
| Revocacion de refresh tokens | Todos los refresh tokens del usuario se revocan despues del restablecimiento. |
| Registro de auditoria | Acciones `PASSWORD_RESET_REQUESTED` y `PASSWORD_RESET_COMPLETED` en AuditLog. |
| Transaccionalidad | El restablecimiento se ejecuta en una transaccion de PostgreSQL. |

## Email Provider

El envio de emails se realiza mediante una interfaz inyectada con Symbol-based DI:

```typescript
export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
}
export const EMAIL_PROVIDER = Symbol('EmailProvider');
```
`DevEmailProvider` imprime el token en la consola para pruebas sin configurar SMTP.

## Modelo de Base de Datos

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash") @db.VarChar(255)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Restrict)
  @@unique([tokenHash])
  @@index([userId])
  @@index([tokenHash])
  @@index([userId, usedAt])
  @@map("password_reset_tokens")
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID | Identificador unico |
| userId | UUID | Referencia al usuario (onDelete: Restrict) |
| tokenHash | VARCHAR(255) | SHA-256 del token. Indexado, unico. |
| expiresAt | TIMESTAMP | Fecha de expiracion |
| usedAt | TIMESTAMP nullable | Marca de uso (null si no utilizado) |
| createdAt | TIMESTAMP | Fecha de creacion |

## Configuracion

| Variable de Entorno | Default | Descripcion |
|---------------------|---------|-------------|
| `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES` | `60` | Tiempo de vida del token en minutos |

## Archivos Relacionados

| Archivo | Descripcion |
|---------|-------------|
| `apps/api/src/modules/auth/auth.service.ts` | Metodos `forgotPassword` y `resetPassword` |
| `apps/api/src/modules/auth/auth.controller.ts` | Endpoints forgot-password y reset-password |
| `apps/api/src/modules/auth/dto/password-recovery.dto.ts` | DTOs de validacion |
| `apps/api/src/modules/auth/services/email/email-provider.interface.ts` | Interfaz EmailProvider |
| `apps/api/src/modules/auth/services/email/dev-email.provider.ts` | Proveedor de desarrollo |
| `apps/api/prisma/schema.prisma` | Modelo PasswordResetToken |
