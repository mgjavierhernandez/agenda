# 14. Módulo de Notificaciones (Notifications)

## Resumen

El módulo de notificaciones implementa un sistema de notificaciones in-app multi-tenant. Cada notificación pertenece a una institución y está dirigida a un usuario específico. Los usuarios solo pueden ver/modificar sus propias notificaciones.

## Entidades del Schema

### Notification (Tenant-scoped, user-scoped)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| institutionId | UUID FK | Institución propietaria |
| userId | UUID FK | Usuario destinatario |
| type | NotificationType | Tipo de notificación |
| title | VARCHAR(200) | Título |
| message | TEXT | Mensaje |
| status | NotificationStatus | UNREAD, READ |
| entityType | VARCHAR(100) | Entidad relacionada (opcional) |
| entityId | String | ID de entidad relacionada (opcional) |
| readAt | DateTime | Momento de lectura (opcional) |
| createdAt/updatedAt | DateTime | Timestamps |

## Enumeraciones

```prisma
enum NotificationType {
  SIGNATURE_REQUEST     # Solicitud de firma creada
  SIGNATURE_COMPLETED   # Firma completada
  SIGNATURE_DECLINED    # Firma rechazada
  COMMUNICATION         # Comunicación publicada
  TASK_UPDATE           # Actividad actualizada
  GENERAL               # Notificación general
}

enum NotificationStatus {
  UNREAD    # No leída
  READ      # Leída
}
```

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | /notifications | notifications:manage | Crear notificación para un usuario |
| GET | /notifications | notifications:read | Listar mis notificaciones (paginado) |
| GET | /notifications/:id | notifications:read | Obtener mi notificación por ID |
| PATCH | /notifications/:id | notifications:read | Marcar como leída |
| PATCH | /notifications | notifications:read | Marcar todas como leídas |
| DELETE | /notifications/:id | notifications:read | Eliminar una notificación |
| DELETE | /notifications | notifications:read | Eliminar todas mis notificaciones |

## RBAC

| Rol | Permisos |
|-----|----------|
| SUPER_ADMIN | notifications:read, notifications:manage |
| INSTITUTION_ADMIN | notifications:read, notifications:manage |
| TEACHER | notifications:read |
| PARENT | notifications:read |
| STUDENT | notifications:read |

**Diseño de autorización:**
- `notifications:manage` — Crear notificaciones para otros usuarios (admin/system)
- `notifications:read` — Ver, marcar como leída, eliminar propias notificaciones

## Visibilidad

- **Admin** (`notifications:manage`): Puede crear notificaciones para cualquier miembro de la institución
- **Todos los usuarios** (`notifications:read`): Solo ven sus propias notificaciones
- Un usuario NUNCA puede ver notificaciones de otro usuario
- Cross-tenant: notificaciones de otra institución retornan 404

## Flujo típico

1. Admin crea notificación → `POST /notifications` (con `userId` del destinatario)
2. Usuario consulta sus notificaciones → `GET /notifications` (solo las suyas)
3. Usuario marca como leída → `PATCH /notifications/:id`
4. Usuario marca todas como leídas → `PATCH /notifications`
5. Usuario elimina una → `DELETE /notifications/:id`
6. Usuario elimina todas → `DELETE /notifications`

## Seguridad IDOR/BOLA

- Todas las queries incluyen `institutionId` + `userId` del token
- `userId` de `req.user.userId` — nunca de body/params para operaciones de lectura/escritura
- Cross-tenant: queries filtran por `institutionId` del token
- Un usuario no puede acceder a notificaciones de otro usuario
- `entityType`/`entityId` son strings genéricos para referencia a entidades relacionadas

## Datos de seed

- 36 permisos (incluye `notifications:manage`)
- 3 notificaciones demo:
  - Para parent: "Nueva solicitud de firma" (SIGNATURE_REQUEST)
  - Para teacher: "Nueva comunicación publicada" (COMMUNICATION)
  - Para admin: "Actividad actualizada" (TASK_UPDATE)

## Archivos creados/modificados

**Nuevos:**
- `src/modules/notifications/notifications.service.ts`
- `src/modules/notifications/notifications.service.spec.ts` (14 tests unitarios)
- `src/modules/notifications/notifications.controller.ts`
- `src/modules/notifications/notifications.module.ts`
- `src/modules/notifications/dto/create-notification.dto.ts`
- `src/modules/notifications/dto/update-notification.dto.ts`
- `src/modules/notifications/dto/list-notifications-query.dto.ts`
- `test/notifications.e2e-spec.ts` (28 tests E2E)

**Modificados:**
- `prisma/schema.prisma` — Enums NotificationType/NotificationStatus + modelo Notification
- `prisma/seed.ts` — `notifications:manage` permiso, asignaciones de roles, datos demo
- `src/app.module.ts` — Importación de NotificationsModule

## Migración

- `20260821235124_add_notifications_module` — Tabla `notifications` con índices en institutionId, userId, status, createdAt, [userId, status]

## Estadísticas de tests

| Tipo | Suites | Tests | Estado |
|------|--------|-------|--------|
| Unitarios | 16 | 240 | ✅ Todos pasan |
| E2E | 12 de 13 | 324 de 327 | ✅ Notifications: 28/28 |
| **Total** | **28** | **564** | **✅ 0 fallos nuevos** |

> Los 3 fallos de schedules son pre-existentes (issue de validación de horarios en el seed, no relacionado con notificaciones).
