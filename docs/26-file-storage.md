# 26 - Almacenamiento de Archivos

Infraestructura de almacenamiento de archivos con abstraccion de proveedor, validacion de MIME types, proteccion contra path traversal, y verificacion de integridad mediante SHA-256.

---

## Arquitectura

El sistema utiliza un patron Strategy para el almacenamiento:

- **StorageProvider**: Interfaz abstracta que define upload, read, delete, exists
- **DevLocalStorageProvider**: Implementacion para desarrollo con almacenamiento en disco local
- **S3StorageProvider**: Preparado para futura implementacion (no implementado aun)

El provider se inyecta via Symbol-based DI (`STORAGE_PROVIDER`).

## Configuracion

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `FILE_STORAGE_PROVIDER` | `local` | Proveedor de almacenamiento |
| `FILE_STORAGE_PATH` | `./storage` | Directorio de almacenamiento local |
| `FILE_MAX_SIZE_MB` | `10` | Tamano maximo de archivo en MB |
| `MAX_TASK_ATTACHMENTS` | `10` | Maximo de adjuntos por tarea |
| `MAX_COMMUNICATION_ATTACHMENTS` | `10` | Maximo de adjuntos por comunicacion |

## Endpoints

| Metodo | Endpoint | Permisos | Descripcion |
|--------|----------|----------|-------------|
| POST | `/api/v1/files` | `files:upload` | Subir archivo (multipart/form-data) |
| GET | `/api/v1/files/:id` | `files:read` | Obtener metadata del archivo |
| GET | `/api/v1/files/:id/download` | `files:read` | Descargar contenido del archivo |
| DELETE | `/api/v1/files/:id` | `files:manage` | Eliminar archivo |

## Seguridad

- **MIME types permitidos**: PDF, PNG, JPEG, WEBP, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Path traversal**: Protegido mediante resolucion de paths y validacion de prefijo
- **Nombres fisicos**: UUIDs generados por servidor, nunca el nombre original
- **Checksum**: SHA-256 calculado para integridad y deduplicacion futura
- **Tamano**: Configurable, default 10MB
- **Tenant isolation**: Storage key incluye institutionId, todas las consultas son tenant-scoped
- **Autorizacion**: Descarga requiere autorizacion contextual (no solo conocer el UUID)

## Modelo de Base de Datos

```prisma
model FileAsset {
  id               String          @id @default(uuid()) @db.Uuid
  institutionId    String          @map("institution_id") @db.Uuid
  originalName     String          @map("original_name") @db.VarChar(255)
  storageKey       String          @map("storage_key") @db.VarChar(500)
  mimeType         String          @db.VarChar(100)
  sizeBytes        Int             @map("size_bytes")
  checksum         String          @db.VarChar(64)
  status           FileAssetStatus @default(ACTIVE)
  uploadedByUserId String          @map("uploaded_by_user_id") @db.Uuid
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
}
```

## Estrategia de Almacenamiento Fisico

Las claves de almacenamiento siguen el patron: `tenant/<institutionId>/files/<uuid>.<extension>`

El directorio se crea automaticamente en el primer upload.

## Eliminacion

Los archivos se eliminan de forma consistente:
1. Si el archivo tiene referencias (attachments), se marca como DELETED (soft delete)
2. Si no tiene referencias, se elimina fisicamente del disco y de la base de datos

## Integracion Futura S3

Para migrar a S3:
1. Implementar `S3StorageProvider` que implemente `StorageProvider`
2. Cambiar `STORAGE_PROVIDER` para inyectar el nuevo provider
3. Actualizar las variables de entorno con credenciales S3
4. No se requieren cambios en el modulo o controlador
