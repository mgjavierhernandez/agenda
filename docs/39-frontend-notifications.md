# PROMPT 39 - Notificaciones (Frontend)

## Executive Summary

Implementación completa del módulo frontend de **Notifications** (Notificaciones) para Agenda Escolar Digital. El módulo permite a los usuarios ver, marcar como leído y eliminar sus notificaciones personales, con integración en el Topbar para mostrar el conteo de no leídas.

## Backend Contract Verified

### Prisma Models

**Notification** (`notifications`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK |
| institutionId | UUID | NO | FK → Institution |
| userId | UUID | NO | FK → User |
| type | NotificationType | NO | Enum |
| title | VARCHAR(200) | NO | |
| message | Text | NO | |
| status | NotificationStatus | NO | Default: UNREAD |
| entityType | VARCHAR(100) | YES | e.g. 'SignatureRequest', 'Communication', 'Task' |
| entityId | String | YES | UUID of related entity |
| readAt | DateTime | YES | Set when marked as read |
| createdAt | DateTime | NO | |
| updatedAt | DateTime | NO | |

### Enums

**NotificationType**: `SIGNATURE_REQUEST`, `SIGNATURE_COMPLETED`, `SIGNATURE_DECLINED`, `COMMUNICATION`, `TASK_UPDATE`, `GENERAL`

**NotificationStatus**: `UNREAD`, `READ`

### Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | /notifications | notifications:manage | Create notification (admin only) |
| GET | /notifications | notifications:read | List own notifications (paginated, with unreadCount) |
| GET | /notifications/:id | notifications:read | Get one notification |
| PATCH | /notifications/:id | notifications:read | Mark one as read |
| PATCH | /notifications | notifications:read | Mark all as read |
| DELETE | /notifications/:id | notifications:read | Delete one |
| DELETE | /notifications | notifications:read | Delete all own |

### Query Parameters (GET /notifications)

- `page` (default: 1), `limit` (default: 20, max: 100)
- `search` (free-text on title/message)
- `status` (UNREAD/READ)
- `type` (any NotificationType value)
- `createdFrom`, `createdTo` (ISO date-time range)

### Response Shapes

- **List**: `{ data: Notification[], meta: { total, page, limit, totalPages }, unreadCount: number }`
- **Single**: `Notification`
- **Mark all**: `{ count: number }`
- **Delete all**: `{ count: number }`

### Permissions

| Role | notifications:read | notifications:manage |
|---|---|---|
| SUPER_ADMIN | YES | YES |
| INSTITUTION_ADMIN | YES | YES |
| TEACHER | YES | NO |
| PARENT | YES | NO |
| STUDENT | YES | NO |

## Frontend Implementation

### Files Created

```
apps/web/src/modules/notifications/
  index.ts                     # Barrel export
  hooks/
    index.ts                   # Hooks barrel
    useNotifications.ts        # Paginated list with filters
    useNotification.ts         # Single notification by ID
    useMarkNotificationRead.ts # Mark one as read
    useMarkAllNotificationsRead.ts # Mark all as read
    useDeleteNotification.ts   # Delete one
    useDeleteAllNotifications.ts # Delete all
  pages/
    NotificationsPage.tsx      # List with search, status/type filters, mark-read/delete actions
    NotificationDetailPage.tsx # Detail view with mark-read/delete
  __tests__/
    notifications-hooks.test.tsx   # 6 hook tests
    notifications-pages.test.tsx   # 17 page tests
```

### Files Modified

- `apps/web/src/api/types.ts` — Added NotificationType, NotificationStatus, Notification, ListNotificationsParams, CreateNotificationInput
- `apps/web/src/components/layout/Topbar.tsx` — Added notification bell with unread count badge
- `apps/web/src/app/router.tsx` — Added /notifications and /notifications/:id routes

### Routes

- `/notifications` — NotificationsPage (list with filters)
- `/notifications/:id` — NotificationDetailPage (detail view)

### Sidebar

- Entry "Notificaciones" already existed with `NOTIFICATIONS_READ` permission — no changes needed

### Topbar

- Added notification bell icon (🔔) with unread count badge
- Shows red badge with count (99+ cap) when unread > 0
- Click navigates to /notifications

### Key Behaviors

- Users can only see their own notifications (enforced by backend)
- Mark as read is idempotent (no-op if already read)
- Mark all as read only affects UNREAD notifications
- Notifications display type icon, title, message, status badge, and date
- UNREAD notifications highlighted with blue background tint
- Desktop: table layout; Mobile: card layout
- Pagination for large result sets

## Tests

### Hook Tests (6)

- useNotifications: fetches paginated data, sends search/filter params
- useNotification: fetches by ID, skips when empty
- useMarkNotificationRead: marks one as read
- useMarkAllNotificationsRead: marks all as read
- useDeleteNotification: deletes one
- useDeleteAllNotifications: deletes all

### Page Tests (17)

- NotificationsPage: header, empty state, table, unread count, mark-all-read button, message rendering
- NotificationDetailPage: details, message, status badge, mark-read button (shown/hidden), delete button, entity type, back button

**Total frontend tests: 206** (all passing)
