# 03 - Autenticacion

**Version:** 0.1.0
**Fecha:** 20 de agosto de 2026
**Estado:** Implementado

Este documento describe la capa base de autenticacion del sistema Agenda Escolar Digital.

---

## 1. Arquitectura

```
Cliente
  │
  │ POST /auth/login (email, password)
  ▼
API
  │
  ├── Normalizar email (trim + lowercase)
  ├── Buscar usuario por email
  ├── Verificar estado (ACTIVE)
  ├── Verificar password (Argon2id)
  │
  ├── Generar Access Token (JWT, 15min)
  ├── Generar Refresh Token (crypto.randomBytes)
  ├── Almacenar hash del refresh token (SHA-256)
  │
  └── Responder: { user, accessToken, refreshToken }

Cliente
  │
  │ POST /auth/refresh (refreshToken)
  ▼
API
  │
  ├── Buscar token por hash (SHA-256)
  ├── Verificar: no expirado, no revocado
  ├── Revocar token actual
  ├── Crear nuevo refresh token
  ├── Generar nuevo access token
  │
  └── Responder: { accessToken, refreshToken }

Cliente
  │
  │ POST /auth/logout (refreshToken)
  ▼
API
  │
  ├── Buscar token por hash (SHA-256)
  ├── Marcar como revocado
  │
  └── Responder: { message: "Logged out" }
```

---

## 2. Password Hashing

### Algoritmo

**Argon2id** con la siguiente configuracion:

| Parametro | Valor |
|-----------|-------|
| type | argon2id |
| memoryCost | 65536 (64 MB) |
| timeCost | 3 iteraciones |
| parallelism | 4 hilos |

### Justificacion

- Argon2id es el ganador del Password Hashing Competition (2015).
- Combina Argon2i (resistente a ataques de canales laterales) y Argon2d (resistente a ataques de GPU).
- Previene ataques de fuerza bruta y rainbow tables.
- Configuracion equilibrada entre seguridad y rendimiento.

### Servicio

```typescript
@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string>;
  async verify(hash: string, password: string): Promise<boolean>;
  validatePasswordPolicy(password: string): { valid: boolean; error?: string };
}
```

---

## 3. Password Policy

### Reglas

| Regla | Valor |
|-------|-------|
| Minimo | 8 caracteres |
| Maximo | 128 caracteres |
| Mayuscula obligatoria | No |
| Minuscula obligatoria | No |
| Numero obligatorio | No |
| Simbolo obligatorio | No |

### Justificacion

- Se permite contrasenas largas/passphrases.
- No se imponen restricciones artificiales que reduzcan la entropia.
- El limite de 128 previene abuso mediante entradas extremadamente grandes.

---

## 4. Login

### Endpoint

```
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "usuario@example.com",
  "password": "..."
}
```

### Response Exitosa (200)

```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "status": "ACTIVE"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "abc123..."
}
```

### Response Error (401)

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### Flujo

1. Normalizar email (trim + lowercase).
2. Buscar usuario por email.
3. Si no existe: 401 "Invalid credentials".
4. Si existe pero estado != ACTIVE: 401 "Invalid credentials".
5. Verificar password con Argon2id.
6. Si password incorrecta: 401 "Invalid credentials".
7. Generar access token JWT.
8. Generar refresh token (crypto.randomBytes).
9. Almacenar hash del refresh token (SHA-256) en PostgreSQL.
10. Retornar user + tokens.

### Seguridad

- Todos los casos de error retornan la misma respuesta: 401 "Invalid credentials".
- Esto impide enumeracion trivial de usuarios.

---

## 5. Access Token JWT

### Claims

| Claim | Valor |
|-------|-------|
| sub | user.id |
| iss | agenda-escolar-digital |
| aud | agenda-api |
| iat | automatico |
| exp | configurable (default: 15m) |

### Configuracion

| Variable | Default | Descripcion |
|----------|---------|-------------|
| JWT_ACCESS_SECRET | (requerido) | Secreto para firmar JWT |
| JWT_ACCESS_EXPIRES_IN | 15m | Tiempo de expiracion |

### Expiracion

- Default: 15 minutos.
- Configurable via `JWT_ACCESS_EXPIRES_IN`.
- Formatos soportados: `15m`, `1h`, `7d`, `3600s`.

### Validacion

El JWT Strategy de Passport valida:
- Firma JWT.
- Expiracion.
- Issuer.
- Audience.

---

## 6. Refresh Token

### Modelo PostgreSQL

```prisma
model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash") @db.VarChar(255)
  expiresAt DateTime  @map("expires_at")
  createdAt DateTime  @default(now()) @map("created_at")
  revokedAt DateTime? @map("revoked_at")
}
```

### Generacion

- 48 bytes aleatorios via `crypto.randomBytes`.
- Codificados como `base64url` (64 caracteres).
- Entropia: 384 bits.

### Almacenamiento

- Nunca se almacena el token en texto plano.
- Se almacena `SHA-256(token)` en la columna `tokenHash`.
- SHA-256 es determinista (mismo input = mismo hash), lo que permite busquedas eficientes.

### Configuracion

| Variable | Default | Descripcion |
|----------|---------|-------------|
| JWT_REFRESH_EXPIRES_IN | 7d | Tiempo de expiracion del refresh token |

---

## 7. Refresh Token Rotation

### Flujo

```
RT-1 (activo)
  │
  │ POST /auth/refresh { refreshToken: RT-1 }
  ▼
API
  │
  ├── Verificar RT-1: valido, no expirado, no revocado
  ├── Revocar RT-1
  ├── Crear RT-2
  ├── Generar nuevo access token
  │
  └── Responder: { accessToken: new, refreshToken: RT-2 }

RT-1 (revocado)
  │
  │ POST /auth/refresh { refreshToken: RT-1 }
  ▼
API
  │
  ├── Verificar RT-1: encontrado pero revocado
  │
  └── Responder: 401 "Invalid credentials"
```

### Proteccion contra Reuse

Si se intenta reutilizar un refresh token revocado:
- Retorna 401 "Invalid credentials".
- No revela que el token fue revocado.

RT-2 continua funcionando mientras sea valido.

---

## 8. Logout

### Endpoint

```
POST /api/v1/auth/logout
```

### Request

```json
{
  "refreshToken": "..."
}
```

### Response (200)

```json
{
  "message": "Logged out successfully"
}
```

### Comportamiento

- Token valido: se revoca.
- Token ya revocado: retorna exito (idempotente).
- Token inexistente: retorna exito (idempotente).
- Token expirado: retorna exito (idempotente).

---

## 9. User Status

### Enum

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### Comportamiento de Autenticacion

| Estado | Puede Autenticarse |
|--------|-------------------|
| ACTIVE | Si |
| INACTIVE | No |
| SUSPENDED | No |

- Solo usuarios con estado `ACTIVE` pueden iniciar sesion.
- La verificacion se realiza durante el login.
- Si el usuario cambia de estado despues de emitir tokens, los tokens existentes siguen siendo validos hasta expirar.

---

## 10. Email Normalization

### Estrategia

- **Trim**: Eliminar espacios al inicio y final.
- **Lowercase**: Convertir a minusculas.

### Ejemplo

```
"  USER@EXAMPLE.COM  " → "user@example.com"
```

### Consistencia

La busqueda en PostgreSQL utiliza `User.email @unique`, que es case-sensitive por defecto en PostgreSQL. La normalizacion garantiza consistencia.

---

## 11. Environment Variables

### .env.example

```bash
# JWT Authentication
JWT_ACCESS_SECRET=dev-only-jwt-access-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Seguridad

- `JWT_ACCESS_SECRET` nunca debe versionarse con un valor real.
- En produccion, usar AWS Secrets Manager / Parameter Store.
- El `.env` esta en `.gitignore`.

---

## 12. Consideraciones de Seguridad

### Controles Implementados

1. **Password hashing**: Argon2id con configuracion segura.
2. **No exposicion de passwordHash**: Nunca se retorna en respuestas API.
3. **No exposicion de refresh token plaintext**: Solo se almacena SHA-256 en DB.
4. **JWT secret fuera de Git**: Configurado via environment variables.
5. **Error generico**: "Invalid credentials" para todos los casos de fallo.
6. **Refresh token rotation**: Tokens de un solo uso.
7. **Revocacion**: Logout revoca el refresh token.

### Limitaciones Actuales

1. **Rate limiting**: No implementado. Requerido antes de produccion.
2. **Account lockout**: No implementado.
3. **Token blacklisting**: Los access tokens no se invalidan inmediatamente al logout (esperan expiracion).

---

## 13. Limitaciones Actuales

### Pendientes para Produccion

- [ ] Rate limiting en login y refresh.
- [ ] Account lockout despues de N intentos fallidos.
- [ ] Invalidacion inmediata de access tokens al logout.
- [ ] Refresh token families para detectar robo.
- [ ] Logging de eventos de autenticacion en AuditLog.

---

## 14. Proximos Pasos

1. **Tenant Context**: Seleccion de institucion activa.
2. **RBAC Guards**: Autorizacion basada en roles y permisos.
3. **Password Reset**: Flujo de recuperacion de contrasena.
4. **MFA**: Autenticacion de multiples factores.

---

## 15. Archivos Relacionados

| Archivo | Descripcion |
|---------|-------------|
| `apps/api/src/modules/auth/` | Modulo de autenticacion |
| `apps/api/src/modules/auth/auth.module.ts` | Modulo NestJS |
| `apps/api/src/modules/auth/auth.controller.ts` | Endpoints de autenticacion |
| `apps/api/src/modules/auth/auth.service.ts` | Logica de autenticacion |
| `apps/api/src/modules/auth/services/password.service.ts` | Servicio de hashing |
| `apps/api/src/modules/auth/services/token.service.ts` | Servicio de tokens |
| `apps/api/src/modules/auth/guards/access-token.guard.ts` | Guard JWT |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | Estrategia Passport |
| `apps/api/src/modules/auth/dto/login.dto.ts` | DTO de login |
| `apps/api/src/modules/auth/dto/refresh-token.dto.ts` | DTO de refresh |
| `apps/api/prisma/schema.prisma` | Modelo RefreshToken |
| `apps/api/prisma/migrations/20260821040000_add_authentication/` | Migracion |
| `test/auth.e2e-spec.ts` | Tests de integracion |
