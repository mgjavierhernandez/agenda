# PROMPT 37 - Comunicaciones y Destinatarios de Comunicaciones (Frontend)

## Implementación completa

### Módulo `communications`
- **Hooks:**
  - `useCommunications` - Listado paginado con filtros (status, audience, search)
  - `useCommunication` - Obtener una comunicación por ID
  - `useCreateCommunication` - Crear comunicación (DRAFT)
  - `useUpdateCommunication` - Actualizar comunicación (solo DRAFT)
  - `usePublishCommunication` - Publicar comunicación (DRAFT → PUBLISHED)
  - `useDeactivateCommunication` - Desactivar comunicación (→ INACTIVE)

- **Páginas:**
  - `CommunicationsPage` - Listado con filtros por estado y audiencia, tabla + cards móviles
  - `CommunicationDetailPage` - Detalle con acciones de ciclo de vida (editar, publicar, desactivar)
  - `CommunicationFormPage` - Formulario crear/editar con validación de 3-200 chars título, 5000 chars contenido, selector de audiencia, fecha de expiración opcional

### Módulo `communication-recipients`
- **Hooks:**
  - `useCommunicationRecipients` - Listado paginado de destinatarios del usuario actual
  - `useMarkCommunicationAsRead` - Marcar una comunicación como leída
  - `useMarkAllCommunicationsAsRead` - Marcar todas como leídas
  - `useUnreadCommunicationsCount` - Conteo de no leídas (refetch cada 30s)

- **Páginas:**
  - `CommunicationInboxPage` - Bandeja de entrada con filtro por estado, botón "Marcar todo como leído", indicador visual de no leídas

### Funcionalidades UX
- **Bandeja de entrada con badge de no leídas** en el sidebar (contador, max 99+)
- **Indicador visual** de comunicaciones no leídas (fondo azul claro, borde izquierdo)
- **Ciclo de vida completo**: DRAFT → PUBLISHED → INACTIVE con confirmación modal
- **Doble vista**: tabla desktop + cards móviles responsivas
- **Filtros combinables** de búsqueda, estado y audiencia
- **Paginación** con navegación anterior/siguiente
- **Labels en español** para todos los estados y audiencias

### Tipos API (types.ts)
- `CommunicationStatus`: DRAFT, PUBLISHED, INACTIVE
- `CommunicationAudience`: ALL, TEACHERS, PARENTS, STUDENTS
- `CommunicationRecipientStatus`: DELIVERED, READ
- Interfaces: Communication, CreateCommunicationInput, UpdateCommunicationInput, CommunicationRecipient, UnreadCountResponse
- Labels constantes: COMMUNICATION_STATUS_LABELS, COMMUNICATION_AUDIENCE_LABELS, COMMUNICATION_RECIPIENT_STATUS_LABELS

### Rutas
- `/communications` - Listado
- `/communications/new` - Crear
- `/communications/:id` - Detalle
- `/communications/:id/edit` - Editar
- `/communication-inbox` - Bandeja de entrada

### Sidebar
- "Comunicaciones" (con permiso COMMUNICATIONS_READ)
- "Bandeja de entrada" (con badge de no leídas)

### Tests
- 13 tests para communications (hooks + pages)
- 8 tests para communication-recipients (hooks + pages)
- Total: 21 tests nuevos (153 total en proyecto)

### Archivos creados
```
apps/web/src/modules/communications/
├── index.ts
├── hooks/
│   ├── index.ts
│   ├── useCommunications.ts
│   ├── useCommunication.ts
│   ├── useCreateCommunication.ts
│   ├── useUpdateCommunication.ts
│   ├── usePublishCommunication.ts
│   └── useDeactivateCommunication.ts
├── pages/
│   ├── CommunicationsPage.tsx
│   ├── CommunicationDetailPage.tsx
│   └── CommunicationFormPage.tsx
└── __tests__/
    ├── communications-hooks.test.tsx
    └── communications-pages.test.tsx

apps/web/src/modules/communication-recipients/
├── index.ts
├── hooks/
│   ├── index.ts
│   ├── useCommunicationRecipients.ts
│   ├── useMarkCommunicationAsRead.ts
│   ├── useMarkAllCommunicationsAsRead.ts
│   └── useUnreadCommunicationsCount.ts
├── pages/
│   └── CommunicationInboxPage.tsx
└── __tests__/
    └── communication-recipients-hooks.test.tsx
```

### Validación
- ✅ ESLint: 0 errores
- ✅ TypeScript: 0 errores
- ✅ Tests: 153 pasando
- ✅ Build: exitoso
