# 27 - Adjuntos de Tareas

Sistema de adjuntos para tareas academicas. Permite asociar archivos a tareas con autorizacion basada en roles y aislamiento por tenant.

---

## Endpoints

| Metodo | Endpoint | Permisos | Descripcion |
|--------|----------|----------|-------------|
| POST | `/api/v1/tasks/:taskId/attachments` | `tasks:manage` | Adjuntar archivo a tarea |
| GET | `/api/v1/tasks/:taskId/attachments` | `tasks:read` | Listar adjuntos de tarea |
| DELETE | `/api/v1/tasks/:taskId/attachments/:attachmentId` | `tasks:manage` | Eliminar adjunto de tarea |

## Flujo

1. Subir archivo via `POST /api/v1/files` con multipart/form-data → retorna FileAsset con ID
2. Asociar via `POST /api/v1/tasks/:taskId/attachments` con body: `{ "fileAssetId": "uuid" }`
3. Listar via `GET /api/v1/tasks/:taskId/attachments`
4. Descargar via `GET /api/v1/files/:fileAssetId/download`
5. Eliminar via `DELETE /api/v1/tasks/:taskId/attachments/:attachmentId`

## Restricciones

| Regla | Valor |
|-------|-------|
| Maximo adjuntos por tarea | 10 (configurable via `MAX_TASK_ATTACHMENTS`) |
| Duplicados | No permitidos (unique constraint taskId + fileAssetId) |
| Tenant isolation | Todos los adjuntos pertenecen a la misma institucion que la tarea |

## Autorizacion

- **INSTITUTION_ADMIN / TEACHER**: Puede crear y eliminar adjuntos en tareas que puede administrar
- **STUDENT**: Puede acceder a adjuntos de tareas asignadas
- **PARENT**: Puede acceder a adjuntos de tareas visibles para el estudiante vinculado

## Modelo de Base de Datos

```prisma
model TaskAttachment {
  id            String   @id @default(uuid()) @db.Uuid
  institutionId String   @map("institution_id") @db.Uuid
  taskId        String   @map("task_id") @db.Uuid
  fileAssetId   String   @map("file_asset_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([taskId, fileAssetId])
}
```

## Eliminacion

Al eliminar un adjunto de tarea:
1. Se elimina la relacion `TaskAttachment`
2. Si el `FileAsset` no tiene otras referencias, se elimina fisicamente
3. Si tiene otras referencias, se marca como DELETED

## Auditoria

| Evento | Descripcion |
|--------|-------------|
| `TASK_ATTACHMENT_CREATED` | Se asocio un archivo a una tarea |
| `TASK_ATTACHMENT_DELETED` | Se elimino un archivo de una tarea |
