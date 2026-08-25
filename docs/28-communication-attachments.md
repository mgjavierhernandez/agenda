# 28 - Adjuntos de Comunicaciones

Sistema de adjuntos para comunicaciones institucionales. Permite asociar archivos a comunicaciones con autorizacion basada en roles y aislamiento por tenant.

---

## Endpoints

| Metodo | Endpoint | Permisos | Descripcion |
|--------|----------|----------|-------------|
| POST | `/api/v1/communications/:communicationId/attachments` | `communications:manage` | Adjuntar archivo a comunicacion |
| GET | `/api/v1/communications/:communicationId/attachments` | `communications:read` | Listar adjuntos de comunicacion |
| DELETE | `/api/v1/communications/:communicationId/attachments/:attachmentId` | `communications:manage` | Eliminar adjunto de comunicacion |

## Flujo

1. Subir archivo via `POST /api/v1/files` con multipart/form-data → retorna FileAsset con ID
2. Asociar via `POST /api/v1/communications/:communicationId/attachments` con body: `{ "fileAssetId": "uuid" }`
3. Listar via `GET /api/v1/communications/:communicationId/attachments`
4. Descargar via `GET /api/v1/files/:fileAssetId/download`
5. Eliminar via `DELETE /api/v1/communications/:communicationId/attachments/:attachmentId`

## Restricciones

| Regla | Valor |
|-------|-------|
| Maximo adjuntos por comunicacion | 10 (configurable via `MAX_COMMUNICATION_ATTACHMENTS`) |
| Duplicados | No permitidos (unique constraint communicationId + fileAssetId) |
| Tenant isolation | Todos los adjuntos pertenecen a la misma institucion que la comunicacion |

## Autorizacion

- **INSTITUTION_ADMIN**: Puede crear y eliminar adjuntos en comunicaciones
- **TEACHER**: Puede crear y eliminar adjuntos en comunicaciones
- **PARENT / STUDENT**: Pueden acceder a adjuntos de comunicaciones visibles segun su audiencia

## Modelo de Base de Datos

```prisma
model CommunicationAttachment {
  id              String   @id @default(uuid()) @db.Uuid
  institutionId   String   @map("institution_id") @db.Uuid
  communicationId String   @map("communication_id") @db.Uuid
  fileAssetId     String   @map("file_asset_id") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([communicationId, fileAssetId])
}
```

## Eliminacion

Al eliminar un adjunto de comunicacion:
1. Se elimina la relacion `CommunicationAttachment`
2. Si el `FileAsset` no tiene otras referencias, se elimina fisicamente
3. Si tiene otras referencias, se marca como DELETED

## Auditoria

| Evento | Descripcion |
|--------|-------------|
| `COMMUNICATION_ATTACHMENT_CREATED` | Se asocio un archivo a una comunicacion |
| `COMMUNICATION_ATTACHMENT_DELETED` | Se elimino un archivo de una comunicacion |
