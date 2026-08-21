# AGENDA ESCOLAR DIGITAL — Documento de Analisis y Arquitectura

**Version:** 1.0
**Fecha:** 20 de agosto de 2026
**Estado:** Para aprobacion

---

## 1. RESUMEN EJECUTIVO

**Agenda Escolar Digital** es una plataforma SaaS multiinstitucion disenada para centralizar la comunicacion y gestion academica entre colegios, docentes, estudiantes y padres/acudientes.

### Propuesta de valor

- Sustituir agendas fisicas, grupos de WhatsApp, fotos de tableros y comunicaciones dispersas por una unica plataforma digital.
- Ser **mas facil de usar que un grupo de WhatsApp**.
- Funcionar en web, Android e iOS con experiencia mobile-first.
- Soportar multiples instituciones de forma aislada y segura (multi-tenant).
- Priorizar la proteccion de datos de menores.
- Estar preparada para escalar desde una sola institucion hasta miles.

### Alcance del MVP (Fase 1)

Autenticacion, gestion de usuarios/roles, instituciones, cursos, estudiantes, padres, docentes, asignaturas, matriculas, horarios, agenda digital, tareas, comunicacion padre-docente, firmas/confirmaciones, notificaciones y dashboard basico.

---

## 2. COMPRENSION DEL PROBLEMA

### Problema que resuelve

Las escuelas actuales manejan la comunicacion entre institucion y familias de forma fragmentada:

| Problema actual | Consecuencia |
|---|---|
| Agendas fisicas | Informacion desactualizada, perdida, ilegibilidad |
| Grupos de WhatsApp | Mezcla de temas, perdida de mensajes, no es institucional |
| Fotos del tablero | Baja calidad, no accesible remotamente, se borra |
| Comunicados en papel | Se pierden, no hay seguimiento de lectura |
| Correo electronico | Lento, no es inmediato, muchos lo ignoran |
| Llamadas_telefonicas | No escalable, consume tiempo docente |

### Para quien es

- **Colegios** de primaria y bachillerato que buscan modernizar su gestion.
- **Docentes** que necesitan una herramienta rapida para publicar tareas y comunicarse.
- **Padres** que quieren estar informados sin depender de canales informales.
- **Estudiantes** que necesitan ver sus tareas, horarios y comunicaciones de forma clara.

### Diferenciadores clave vs. soluciones existentes

1. **Mobile-first real**: no es una web adaptada, es pensada para movil desde el inicio.
2. **Multi-tenancy nativo**: cada colegio es un tenant aislado.
3. **UX simplificada**: menos clics que un grupo de WhatsApp para la accion principal.
4. **Experiencia diferenciada por nivel**: primaria visual vs. bachillerato completo.
5. **Seguridad de menores**: diseno con cumplimiento de proteccion de datos desde el inicio.

---

## 3. ACTORES Y ROLES

### 3.1 Administrador de Institucion

| Permiso | Accion |
|---|---|
| Gestionar institucion | Crear, editar, configurar |
| Gestionar grados | CRUD de grados |
| Gestionar cursos/grupos | CRUD de cursos por grado |
| Gestionar estudiantes | CRUD, matricula |
| Gestionar padres/acudientes | CRUD, vinculacion a estudiantes |
| Gestionar docentes | CRUD, asignacion a cursos |
| Gestionar asignaturas | CRUD, asignacion a cursos/docentes |
| Configurar horarios | Definir horarios por curso/asignatura |
| Calendario academico | Crear/editar eventos institucionales |
| Gestionar roles/permisos | Asignar roles, definir permisos |
| Comunicaciones institucionales | Enviar comunicados masivos |
| Consultar reportes | Asistencia, tareas, actividad |
| Auditoria | Consultar logs de actividad |

### 3.2 Docente

| Permiso | Accion |
|---|---|
| Consultar horario | Ver su horario semanal |
| Consultar cursos | Ver cursos asignados |
| Consultar estudiantes | Ver lista de estudiantes por curso |
| Crear tareas | Crear, editar, publicar tareas |
| Asignar tareas | A cursos o estudiantes especificos |
| Adjuntar archivos | En tareas y comunicaciones |
| Registrar observaciones | Sobre estudiantes |
| Registrar asistencia | Presente/ausente/excusa/retardo |
| Enviar comunicaciones | A padres de sus cursos |
| Recibir mensajes | De padres y colegio |
| Solicitar firmas | A padres/acudientes |
| Consultar firmas | Estado de firmas solicitadas |
| Consultar lectura | Ver quien leyo sus comunicaciones |

### 3.3 Estudiante

| Permiso | Accion |
|---|---|
| Consultar horario | Ver horario del dia/semana |
| Consultar asignaturas | Ver materias del curso |
| Consultar tareas | Ver todas las tareas (pendientes, vencidas, entregadas) |
| Entregar trabajos | Subir archivos como entrega |
| Consultar comunicaciones | Leer mensajes recibidos |
| Consultar eventos | Ver eventos del calendario |
| Recibir notificaciones | Notificaciones push/web |

**Nota UX**: Para primaria, la interfaz sera especialmente visual con iconos grandes, navegacion simple y lenguaje claro.

### 3.4 Padre / Madre / Acudiente

| Permiso | Accion |
|---|---|
| Gestionar hijos | Ver y cambiar entre hijos asociados |
| Consultar horario | Ver horario del hijo seleccionado |
| Consultar tareas | Ver tareas del hijo seleccionado |
| Recibir notificaciones | Tareas, comunicaciones, firmas |
| Leer comunicaciones | De docentes y colegio |
| Comunicarse con docentes | Mensajes directos autorizados |
| Firmar comunicaciones | Confirmar/firmar documentos |
| Consultar historial de firmas | Ver firmas anteriores |
| Consultar asistencia | Ver registro de asistencia del hijo |
| Consultar eventos | Ver calendario del colegio |
| Consultar circulares | Documentos institucionales |

---

## 4. REQUISITOS FUNCIONALES

### 4.1 Modulo de Autenticacion y Acceso

| ID | Requisito | Prioridad |
|---|---|---|
| AF-001 | Login con email/contrasena | Must |
| AF-002 | Recuperacion de contrasena por email | Must |
| AF-003 | Seleccion de institucion (si el usuario pertenece a varias) | Must |
| AF-004 | Gestion de sesion (cerrar sesion, sesiones activas) | Must |
| AF-005 | MFA opcional/configurable | Should |
| AF-006 | Cambio de contrasena | Must |
| AF-007 | Actualizacion de perfil | Must |

### 4.2 Modulo de Instituciones

| ID | Requisito | Prioridad |
|---|---|---|
| AF-010 | Crear y configurar institucion | Must |
| AF-011 | Configurar logo, colores, nombre | Must |
| AF-012 | Gestionar periodos academicos | Must |
| AF-013 | Configurar parametros generales | Should |

### 4.3 Modulo de Usuarios y Roles

| ID | Requisito | Prioridad |
|---|---|---|
| AF-020 | CRUD de usuarios | Must |
| AF-021 | Asignacion de roles por tenant | Must |
| AF-022 | RBAC (control de acceso basado en roles) | Must |
| AF-023 | Gestion de permisos granulares | Should |

### 4.4 Modulo Academico

| ID | Requisito | Prioridad |
|---|---|---|
| AF-030 | CRUD de grados | Must |
| AF-031 | CRUD de cursos | Must |
| AF-032 | CRUD de asignaturas | Must |
| AF-033 | CRUD de estudiantes | Must |
| AF-034 | CRUD de padres/acudientes | Must |
| AF-035 | CRUD de docentes | Must |
| AF-036 | Matricula de estudiantes a cursos | Must |
| AF-037 | Vinculacion acudiente-estudiante (N:N) | Must |
| AF-038 | Asignacion docente-curso-asignatura | Must |
| AF-039 | Periodos academicos | Must |

### 4.5 Modulo de Horarios

| ID | Requisito | Prioridad |
|---|---|---|
| AF-040 | Definicion de horarios por curso/asignatura | Must |
| AF-041 | Horario del estudiante (auto-generado) | Must |
| AF-042 | Horario del docente (auto-generado) | Must |
| AF-043 | Vista administrativa de horarios | Must |

### 4.6 Modulo de Agenda Digital

| ID | Requisito | Prioridad |
|---|---|---|
| AF-050 | Agenda personalizada por estudiante | Must |
| AF-051 | Vista dia/semana/mes | Must |
| AF-052 | Visualizacion de tareas por dia | Must |
| AF-053 | Visualizacion de eventos por dia | Must |
| AF-054 | Visualizacion de comunicaciones relevantes | Must |
| AF-055 | Recordatorios y firmas pendientes | Must |
| AF-056 | Informacion filtrada por permisos del usuario | Must |

### 4.7 Modulo de Tareas

| ID | Requisito | Prioridad |
|---|---|---|
| AF-060 | Crear tarea (titulo, descripcion, asignatura, curso, fechas, prioridad) | Must |
| AF-061 | Adjuntar archivos y enlaces | Must |
| AF-062 | Asignar a curso o estudiantes especificos | Must |
| AF-063 | Estados: Borrador -> Publicada -> Pendiente -> Entregada -> Vencida -> Revisada | Must |
| AF-064 | Entrega de trabajos por estudiante | Must |
| AF-065 | Seguimiento individual por docente | Must |
| AF-066 | Notificacion automatica al publicar | Must |
| AF-067 | Notificacion de proximo vencimiento | Must |

### 4.8 Modulo de Comunicacion

| ID | Requisito | Prioridad |
|---|---|---|
| AF-070 | Mensajes individuales (padre-docente) | Must |
| AF-071 | Mensajes por curso | Should |
| AF-072 | Comunicaciones masivas (institucion-familias) | Should |
| AF-073 | Tipos de contenido: texto, imagen, PDF, documentos | Must |
| AF-074 | Registro: remitente, destinatario, fecha/hora, estado envio/lectura | Must |
| AF-075 | Historial completo de conversaciones | Must |
| AF-076 | Indicador de lectura | Should |

### 4.9 Modulo de Firmas/Confirmaciones

| ID | Requisito | Prioridad |
|---|---|---|
| AF-080 | Solicitar firma/confirmacion (docente->padre y padre->docente) | Must |
| AF-081 | Estados: Pendiente -> Firmado -> Vencido | Must |
| AF-082 | Registro: usuario, fecha, hora, comunicacion, evidencia | Must |
| AF-083 | Confirmacion de lectura (diferenciada de firma) | Should |

### 4.10 Modulo de Asistencia

| ID | Requisito | Prioridad |
|---|---|---|
| AF-090 | Registro: Presente/Ausente/Excusa/Retardo | Phase 2 |
| AF-091 | Justificacion y evidencia documental | Phase 2 |
| AF-092 | Historial y reportes | Phase 2 |
| AF-093 | Notificacion a padres | Phase 2 |

### 4.11 Modulo de Calendario

| ID | Requisito | Prioridad |
|---|---|---|
| AF-100 | Eventos: examenes, entregas, reuniones, vacaciones, etc. | Phase 2 |
| AF-101 | Eventos automaticos en agendas | Phase 2 |

### 4.12 Modulo de Notificaciones

| ID | Requisito | Prioridad |
|---|---|---|
| AF-110 | Notificaciones web (in-app) | Must |
| AF-111 | Push notifications Android | Must |
| AF-112 | Push notifications iOS | Must |
| AF-113 | Configuracion de preferencias por usuario | Should |
| AF-114 | Eventos: nueva tarea, cambio tarea, vencimiento, mensaje, firma, inasistencia, evento | Must |

### 4.13 Modulo Dashboard

| ID | Requisito | Prioridad |
|---|---|---|
| AF-120 | Dashboard administrador: estadisticas generales | Must |
| AF-121 | Dashboard docente: proximas clases, tareas, comunicaciones | Must |
| AF-122 | Dashboard padre: hijos, tareas, eventos, firmas | Must |
| AF-123 | Dashboard estudiante: proxima clase, tareas, eventos | Must |

---

## 5. REQUISITOS NO FUNCIONALES

### 5.1 Seguridad

| ID | Requisito | Prioridad |
|---|---|---|
| ANF-001 | Autenticacion segura (JWT con refresh tokens) | Must |
| ANF-002 | RBAC + autorizacion por tenant | Must |
| ANF-003 | Cifrado TLS 1.2+ en transito | Must |
| ANF-004 | Cifrado AES-256 para datos sensibles en reposo | Must |
| ANF-005 | Rate limiting en APIs | Must |
| ANF-006 | Proteccion CSRF/XSS/SQL Injection | Must |
| ANF-007 | Auditoria completa de acciones | Must |
| ANF-008 | Gestion segura de secretos (Vault/Secrets Manager) | Must |
| ANF-009 | Revocacion de sesiones | Must |
| ANF-010 | Control de dispositivos/sesiones activas | Should |
| ANF-011 | Cumplimiento de normativa de proteccion de menores | Must* |

*Requiere revision juridica para el pais de operacion.

### 5.2 Rendimiento

| Metrica | Objetivo |
|---|---|
| Tiempo de respuesta API (P95) | < 200ms |
| Carga inicial de la app | < 3 segundos (3G) |
| Tiempo de carga de pagina | < 1.5 segundos |
| Notificacion push | < 5 segundos desde origen |
| Upload de archivos | < 10 segundos para 10MB |
| Concurrencia inicial | 1,000 usuarios simultaneos |

### 5.3 Disponibilidad

| Fase | SLA objetivo |
|---|---|
| MVP (Fase 1) | 99.5% (~3.6 dias downtime/ano) |
| Fase 2 | 99.9% (~8.7 horas downtime/ano) |
| Fase 3+ | 99.95% |

### 5.4 Escalabilidad

| Dimension | Estrategia |
|---|---|
| Instituciones | Escalado horizontal de servicios |
| Usuarios | Particionamiento por tenant_id en BD |
| Archivos | Object storage con CDN |
| Mensajes | Colas de mensajes + cache |
| Notificaciones | Servicio dedicado de push + cola |

### 5.5 Observabilidad

- Logs estructurados (JSON) con correlacion por request.
- Metricas: latencia, throughput, errores, uso de recursos.
- Tracing distribuido.
- Alertas configurables.
- Dashboard de infraestructura.

### 5.6 Recuperacion

| Parametro | Objetivo |
|---|---|
| RPO (Recovery Point Objective) | < 1 hora |
| RTO (Recovery Time Objective) | < 4 horas |
| Backup BD | Diario automatico + point-in-time recovery |
| Backup archivos | Diario, replicacion cross-region |
| Disaster Recovery | Restauracion en < 4 horas |

---

## 6. AMBIGUEDADES Y PREGUNTAS ABIERTAS

### Criticas (bloquean decisiones de arquitectura)

| # | Pregunta | Impacto | Recomendacion |
|---|---|---|---|
| C-01 | En que pais se operara inicialmente? Esto determina normativa de proteccion de menores, almacenamiento de datos y facturacion. | Alto | Definir antes de configurar infraestructura. |
| C-02 | Que mecanismo de firma electronica se requiere? Basta con confirmacion de lectura/aceptacion o se necesita firma digital certificada? | Alto | Para MVP: confirmacion de aceptacion con registro de timestamp + IP. Firma certificada: evaluar en Fase 2. |
| C-03 | La institucion puede tener un super-admin global (plataforma) ademas del admin del colegio? | Alto | Si, recomendar un rol "Super Admin" de plataforma para soporte y administracion global. |
| C-04 | Como se manejan los usuarios que pertenecen a multiples instituciones (ej: docente en dos colegios)? | Alto | Soportar multi-tenancy por usuario: un usuario puede tener perfiles en multiples tenants. |
| C-05 | Que proveedor cloud se usara? AWS, Azure, GCP, otro? | Alto | Recomendar AWS o GCP por madurez y costos. Definir antes de DevOps. |

### Importantes (afectan funcionalidad)

| # | Pregunta | Impacto | Recomendacion |
|---|---|---|---|
| I-01 | Las tareas deben permitir calificacion numerica o solo estado (entregada/revisada)? | Medio | MVP: solo estados. Calificacion en Fase 2. |
| I-02 | Los padres pueden enviar mensajes directos a cualquier docente o solo a los de sus hijos? | Medio | Solo a docentes asignados a los cursos de sus hijos. |
| I-03 | Las comunicaciones masivas requieren aprobacion? | Medio | No para MVP. Considerar en Fase 2. |
| I-04 | Se necesita soporte para multiples idiomas? | Medio | MVP: espanol. Internacionalizacion preparada en arquitectura. |
| I-05 | Los estudiantes de primaria acceden con su propia cuenta o solo a traves del padre? | Medio | Definir: cuenta propia con credenciales simplificadas o solo vista compartida? |
| I-06 | Que limites de almacenamiento por institucion/usuario? | Medio | Definir tiers: Free/Basic/Premium. |
| I-07 | Se requiere integracion con Sistemas de Informacion Academica existentes? | Medio | No para MVP. Preparar API para futuras integraciones. |

### Opcionales (mejoras deseables)

| # | Pregunta | Impacto | Recomendacion |
|---|---|---|---|
| O-01 | Modo offline para la app movil? | Bajo | No para MVP. Considerar en Fase 3. |
| O-02 | Soporte para tablets en aula? | Bajo | Responsive deberia cubrirlo. |
| O-03 | Chat en tiempo real o mensajeria asincrona? | Bajo | MVP: asincrona. Chat en tiempo real en Fase 3. |
| O-04 | Accesibilidad WCAG 2.1 AA completa? | Bajo | MVP: basica. Completa en Fase 2. |

---

## 7. ARQUITECTURA PROPUESTA

### 7.1 Diagrama Conceptual

```
+-----------------------------------------------------------+
|                      CLIENTES                              |
|  +----------+  +----------+  +----------------------+     |
|  | Web App  |  | Android  |  | iOS App              |     |
|  | (React)  |  | (Flutter)|  | (Flutter)            |     |
|  +----+-----+  +----+-----+  +----------+-----------+     |
|       |              |                    |                |
+-------+--------------+--------------------+----------------+
        |              |                    |
        +--------------+--------------------+
                       | HTTPS
                       v
+-----------------------------------------------------------+
|                  API GATEWAY / CDN                         |
|              (Nginx / Cloudflare / ALB)                    |
+--------------------------+--------------------------------+
                           |
                           v
+-----------------------------------------------------------+
|               SERVICIO BACKEND (API REST)                  |
|                   (Node.js + NestJS)                       |
|  +---------+ +----------+ +-----------+ +-----------+     |
|  |  Auth   | |  Tenant  | |   Core    | |   Push    |     |
|  | Module  | |  Module  | |  Modules  | |  Module   |     |
|  +---------+ +----------+ +-----------+ +-----------+     |
+---+--------------+--------------+---------------+---------+
    |              |              |               |
    v              v              v               v
+--------+  +----------+  +----------+  +--------------+
|PostgreSQL| |  Redis   | |  S3/OSS  | | Firebase /   |
|   BD    | |  Cache   | | Archivos | | OneSignal    |
+---------+  +----------+  +----------+  +--------------+
```

### 7.2 Justificacion de la arquitectura

**Monolito modular** para MVP, no microservicios.

**Razones:**
1. **Simplicidad**: un solo deploy, una base de datos, menos complejidad operativa.
2. **Velocidad de desarrollo**: mas rapido para MVP.
3. **Costo**: menos servicios = menor costo infraestructura.
4. **Evolucion**: diseno modular permite extraer microservicios despues si es necesario.

**Patron**: Modular Monolith con separacion por dominios (modules).

**Estructura del backend:**
```
src/
+-- modules/
|   +-- auth/
|   +-- tenant/
|   +-- user/
|   +-- institution/
|   +-- academic/       (grados, cursos, asignaturas, matricula)
|   +-- schedule/
|   +-- agenda/
|   +-- task/
|   +-- communication/
|   +-- signature/
|   +-- notification/
|   +-- file/
|   +-- audit/
+-- common/
|   +-- guards/
|   +-- interceptors/
|   +-- filters/
|   +-- decorators/
|   +-- helpers/
+-- config/
+-- main.ts
```

---

## 8. ARQUITECTURA SaaS MULTI-TENANT

### 8.1 Estrategia de aislamiento de datos

**Recomendacion: Base de datos compartida con `tenant_id` (Shared Database, Shared Schema)**

### Justificacion

| Opcion | Pros | Contras | Veredicto |
|---|---|---|---|
| DB por institucion | Aislamiento maximo | Costo alto, dificil mantener, complejidad de migraciones | X No para MVP |
| Schema por institucion | Buen aislamiento | Complejidad media, overhead de schemas | ! Posible evolucion |
| **Shared DB + tenant_id** | **Bajo costo, simple, escalable** | **Requiere disciplina en queries** | **OK Recomendado para MVP** |

### 8.2 Implementacion

```sql
-- Toda tabla principal incluye tenant_id
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    ...
    UNIQUE(tenant_id, email)
);

-- Indices siempre incluyen tenant_id primero
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

### 8.3 Identificacion del tenant

1. **En JWT**: el token incluye `tenant_id`.
2. **En cada request**: el middleware extrae `tenant_id` del token.
3. **En cada query**: el repository aplica filtro `WHERE tenant_id = :tenantId`.
4. **En migraciones**: todas las tablas tienen `tenant_id` where aplique.

### 8.4 Tenant Context (pseudocodigo)

```
Middleware que inyecta el tenant en cada request:
  - Extraer tenantId del token JWT
  - Si no existe tenantId -> UnauthorizedException
  - Inyectar tenantContext en el request
  - Continuar
```

### 8.5 Auditoria por tenant

- Cada accion auditada incluye `tenant_id`.
- Los reportes de auditoria se filtran por tenant.
- Un Super Admin puede consultar auditoria global.

### 8.6 Almacenamiento de archivos por tenant

```
s3://bucket-name/
  +-- tenants/
      +-- {tenant-id-1}/
      |   +-- tasks/
      |   +-- communications/
      |   +-- profiles/
      +-- {tenant-id-2}/
          +-- tasks/
          +-- communications/
          +-- profiles/
```

### 8.7 Evolucion futura

Si una institucion grande requiere aislamiento fisico:
1. Migrar su `tenant_id` a un schema dedicado.
2. O migrar a una DB dedicada con redireccion de queries.
3. La arquitectura modular del backend lo permite sin reescritura completa.

---

## 9. STACK TECNOLOGICO RECOMENDADO

### 9.1 Tabla comparativa

| Capa | Opcion A | Opcion B | Opcion C | **Seleccion** |
|---|---|---|---|---|
| **Frontend Web** | React + Vite | Next.js | Angular | **React + Vite** |
| **Mobile** | Flutter | React Native | Native (Kotlin/Swift) | **Flutter** |
| **Backend** | Node.js + NestJS | Python + FastAPI | Go + Gin | **Node.js + NestJS** |
| **BD** | PostgreSQL | MySQL | MongoDB | **PostgreSQL** |
| **Cache** | Redis | Memcached | DragonflyDB | **Redis** |
| **Colas** | Bull (Redis) | RabbitMQ | AWS SQS | **Bull (Redis)** |
| **Archivos** | AWS S3 | MinIO | Cloudflare R2 | **AWS S3** (o R2) |
| **Auth** | Custom JWT | Auth0 | Supabase Auth | **Custom JWT** |
| **Push** | Firebase FCM | OneSignal | Expo Notifications | **Firebase FCM** |
| **Infra** | AWS | GCP | Azure | **AWS** |
| **CDN** | CloudFront | Cloudflare | Bunny CDN | **Cloudflare** |
| **Monitoring** | Datadog | Grafana+Prometheus | Sentry | **Grafana + Sentry** |

### 9.2 Justificacion por capa

#### Frontend Web: React + Vite

| Aspecto | Detalle |
|---|---|
| Ventajas | Ecosistema amplio, gran comunidad, componentes reutilizables, Vite es rapido |
| Desventajas | No tiene SSR nativo (no necesario para esta app) |
| Costo | Gratis (open source) |
| Complejidad | Media |
| Escalabilidad | Excelente |
| Riesgo | Bajo |
| Justificacion | React es el estandar de la industria. Vite ofrece DX excelente. Para una app autenticada, SSR no es necesario. |

#### Mobile: Flutter

| Aspecto | Detalle |
|---|---|
| Ventajas | Single codebase Android+iOS, rendimiento nativo, UI consistente, hot reload |
| Desventajas | Tamano del APK/IPA inicial (~15MB), dependencia de Google |
| Costo | Gratis |
| Complejidad | Media |
| Escalabilidad | Excelente |
| Riesgo | Medio (dependencia de Google, pero Flutter tiene buena traccion) |
| Justificacion | Un solo equipo de mobile en vez de dos. Rendimiento casi nativo. UI personalizable para primaria/bachillerato. |

#### Backend: Node.js + NestJS

| Aspecto | Detalle |
|---|---|
| Ventajas | TypeScript compartido con frontend, altisimo throughput I/O, NestJS aporta estructura |
| Desventajas | No ideal para CPU intensivo (no aplica aqui) |
| Costo | Gratis |
| Complejidad | Media |
| Escalabilidad | Excelente (horizontal) |
| Riesgo | Bajo |
| Justificacion | NestJS ofrece arquitectura modular, DI, Guards, Interceptors. Perfecto para API REST con JWT. TypeScript end-to-end reduce errores. |

#### Base de datos: PostgreSQL

| Aspecto | Detalle |
|---|---|
| Ventajas | ACID, JSON support, extensiones (pg_trgm, uuid-ossp), maduro, escalable |
| Desventajas | Configuracion requiere conocimiento |
| Costo | Gratis (self-hosted) / RDS desde ~$15/mes |
| Complejidad | Media |
| Escalabilidad | Vertical + horizontal (read replicas) |
| Riesgo | Bajo |
| Justificacion | El estandar para aplicaciones SaaS. Soporta multi-tenant con tenant_id eficientemente. Point-in-time recovery incluido. |

#### Cache: Redis

| Aspecto | Detalle |
|---|---|
| Ventajas | Rapido, versatil (cache + colas + pub/sub), persistencia opcional |
| Desventajas | Memoria en RAM |
| Costo | Gratis (self-hosted) / ElastiCache desde ~$15/mes |
| Complejidad | Baja |
| Escalabilidad | Cluster mode |
| Riesgo | Bajo |
| Justificacion | Cache de sesiones, rate limiting, colas de notificaciones, datos temporales. |

#### Push Notifications: Firebase FCM

| Aspecto | Detalle |
|---|---|
| Ventajas | Gratis, soporta Android+iOS+Web, integracion con Flutter |
| Desventajas | Dependencia de Google |
| Costo | Gratis hasta 50K mensajes/dia |
| Complejidad | Baja |
| Escalabilidad | Masiva |
| Riesgo | Bajo |
| Justificacion | Estandar para push notifications. Integracion nativa con Flutter. |

---

## 10. MODELO DE DATOS

### 10.1 Entidades Principales

```
TENANT
  |
  +--< USERS (1:N)
  |     |
  |     +--< USER_TENANT_ROLES (N:N)
  |           |
  |           +-- ROLES
  |                 +--< ROLE_PERMISSIONS (N:N)
  |                       +-- PERMISSIONS
  |
  +--< INSTITUTION_SETTINGS (1:1)
  |
  +--< GRADES (1:N)
  |     +--< COURSES (1:N)
  |           +--< ENROLLMENTS (N:N) --> STUDENTS
  |           +--< TEACHER_ASSIGNMENTS (N:N) --> USERS (docentes)
  |           +--< SCHEDULES (1:N)
  |
  +--< SUBJECTS (1:N)
  |     +--< SUBJECT_ASSIGNMENTS (N:N) --> COURSES + USERS (docentes)
  |
  +--< STUDENTS (1:N)
  |     +--< GUARDIAN_STUDENTS (N:N) --> GUARDIANS (padres)
  |
  +--< TASKS (1:N)
  |     +--< TASK_ASSIGNMENTS (N:N) --> STUDENTS
  |     +--< TASK_SUBMISSIONS (1:N) --> STUDENTS
  |
  +--< COMMUNICATIONS (1:N)
  |     +--< COMMUNICATION_RECIPIENTS (N:N) --> USERS
  |     +--< MESSAGES (1:N)
  |
  +--< SIGNATURES (1:N)
  |
  +--< NOTIFICATIONS (1:N)
  |
  +--< FILES (1:N)
  |
  +--< AUDIT_LOGS (1:N)
```

### 10.2 Modelo Logico de Datos

#### tenants
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE, NOT NULL |
| logo_url | TEXT | NULL |
| primary_color | VARCHAR(7) | NULL |
| config | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |

#### users
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id, NOT NULL |
| email | VARCHAR(255) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| phone | VARCHAR(20) | NULL |
| avatar_url | TEXT | NULL |
| is_active | BOOLEAN | DEFAULT true |
| last_login_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |
| UNIQUE | (tenant_id, email) | |

#### roles
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id, NOT NULL |
| name | VARCHAR(50) | NOT NULL (admin, docente, estudiante, padre) |
| description | TEXT | NULL |
| is_system | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | NOT NULL |

#### user_roles (relacion usuario-rol por tenant)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users.id |
| role_id | UUID | FK -> roles.id |
| tenant_id | UUID | FK -> tenants.id |
| UNIQUE | (user_id, role_id, tenant_id) | |

#### permissions
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| code | VARCHAR(100) | UNIQUE (ej: tasks.create, tasks.read) |
| module | VARCHAR(50) | NOT NULL |
| description | TEXT | NULL |

#### role_permissions
| Campo | Tipo | Constraints |
|---|---|---|
| role_id | UUID | FK -> roles.id |
| permission_id | UUID | FK -> permissions.id |
| PRIMARY KEY | (role_id, permission_id) | |

#### grades
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| name | VARCHAR(100) | NOT NULL |
| level | VARCHAR(20) | NOT NULL (primaria, bachillerato) |
| sort_order | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | NOT NULL |

#### courses (cursos/grupos)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| grade_id | UUID | FK -> grades.id |
| name | VARCHAR(100) | NOT NULL (ej: "4to Primaria A") |
| section | VARCHAR(10) | NULL (A, B, C) |
| academic_year | INTEGER | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

#### subjects (asignaturas)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| name | VARCHAR(100) | NOT NULL |
| code | VARCHAR(20) | NULL |
| created_at | TIMESTAMP | NOT NULL |

#### students
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users.id (cuenta del estudiante) |
| tenant_id | UUID | FK -> tenants.id |
| student_code | VARCHAR(50) | NULL |
| date_of_birth | DATE | NULL |
| created_at | TIMESTAMP | NOT NULL |

#### guardians (padres/acudientes)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users.id |
| tenant_id | UUID | FK -> tenants.id |
| created_at | TIMESTAMP | NOT NULL |

#### guardian_students (vinculo padre-estudiante)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| guardian_id | UUID | FK -> guardians.id |
| student_id | UUID | FK -> students.id |
| tenant_id | UUID | FK -> tenants.id |
| relationship | VARCHAR(50) | NOT NULL (madre, padre, acudiente) |
| is_primary | BOOLEAN | DEFAULT false |
| UNIQUE | (guardian_id, student_id, tenant_id) | |

#### enrollments (matriculas)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| student_id | UUID | FK -> students.id |
| course_id | UUID | FK -> courses.id |
| tenant_id | UUID | FK -> tenants.id |
| academic_year | INTEGER | NOT NULL |
| enrolled_at | TIMESTAMP | DEFAULT NOW() |
| UNIQUE | (student_id, course_id, tenant_id, academic_year) | |

#### teacher_assignments (asignacion docente-curso)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| teacher_user_id | UUID | FK -> users.id |
| course_id | UUID | FK -> courses.id |
| subject_id | UUID | FK -> subjects.id |
| tenant_id | UUID | FK -> tenants.id |
| academic_year | INTEGER | NOT NULL |
| UNIQUE | (teacher_user_id, course_id, subject_id, tenant_id, academic_year) | |

#### schedules (horarios)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| course_id | UUID | FK -> courses.id |
| subject_id | UUID | FK -> subjects.id |
| teacher_user_id | UUID | FK -> users.id |
| day_of_week | INTEGER | NOT NULL (0=Lunes, 6=Domingo) |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| room | VARCHAR(50) | NULL |

#### tasks (tareas)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| created_by | UUID | FK -> users.id (docente) |
| subject_id | UUID | FK -> subjects.id |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| priority | VARCHAR(20) | DEFAULT 'normal' (baja, normal, alta, urgente) |
| status | VARCHAR(20) | DEFAULT 'draft' (draft, published, pending, overdue, reviewed) |
| published_at | TIMESTAMP | NULL |
| due_date | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

#### task_assignments (asignacion de tarea a curso/estudiante)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK -> tasks.id |
| course_id | UUID | FK -> courses.id (NULL si es individual) |
| student_id | UUID | FK -> students.id (NULL si es por curso) |
| tenant_id | UUID | FK -> tenants.id |

#### task_submissions (entregas)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK -> tasks.id |
| student_id | UUID | FK -> students.id |
| tenant_id | UUID | FK -> tenants.id |
| status | VARCHAR(20) | DEFAULT 'pending' (pending, submitted, reviewed) |
| submitted_at | TIMESTAMP | NULL |
| reviewed_at | TIMESTAMP | NULL |
| notes | TEXT | NULL |

#### communications (comunicaciones)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| sender_id | UUID | FK -> users.id |
| subject | VARCHAR(255) | NULL |
| body | TEXT | NOT NULL |
| type | VARCHAR(30) | NOT NULL (message, announcement, circular) |
| priority | VARCHAR(20) | DEFAULT 'normal' |
| created_at | TIMESTAMP | NOT NULL |

#### communication_recipients
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| communication_id | UUID | FK -> communications.id |
| recipient_id | UUID | FK -> users.id |
| tenant_id | UUID | FK -> tenants.id |
| is_read | BOOLEAN | DEFAULT false |
| read_at | TIMESTAMP | NULL |

#### signatures (firmas/confirmaciones)
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| communication_id | UUID | FK -> communications.id |
| requested_by | UUID | FK -> users.id |
| signer_id | UUID | FK -> users.id |
| status | VARCHAR(20) | DEFAULT 'pending' (pending, signed, expired) |
| signed_at | TIMESTAMP | NULL |
| ip_address | VARCHAR(45) | NULL |
| user_agent | TEXT | NULL |
| created_at | TIMESTAMP | NOT NULL |
| expires_at | TIMESTAMP | NULL |

#### notifications
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| user_id | UUID | FK -> users.id |
| title | VARCHAR(255) | NOT NULL |
| body | TEXT | NOT NULL |
| type | VARCHAR(50) | NOT NULL |
| data | JSONB | NULL |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | NOT NULL |

#### files
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| uploaded_by | UUID | FK -> users.id |
| original_name | VARCHAR(255) | NOT NULL |
| stored_path | TEXT | NOT NULL |
| mime_type | VARCHAR(100) | NOT NULL |
| size_bytes | BIGINT | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

#### audit_logs
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK -> tenants.id |
| user_id | UUID | FK -> users.id (NULL para sys) |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NULL |
| old_values | JSONB | NULL |
| new_values | JSONB | NULL |
| ip_address | VARCHAR(45) | NULL |
| created_at | TIMESTAMP | NOT NULL |

### 10.3 Indices Relevantes

```sql
-- Tenant-scoped queries (el patron mas comun)
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_courses_tenant_grade ON courses(tenant_id, grade_id);
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_tenant_due ON tasks(tenant_id, due_date);
CREATE INDEX idx_enrollments_student ON enrollments(student_id, tenant_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id, tenant_id);
CREATE INDEX idx_schedules_course ON schedules(tenant_id, course_id, day_of_week);
CREATE INDEX idx_communications_sender ON communications(tenant_id, sender_id);
CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, is_read);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(tenant_id, entity_type, entity_id);
```

### 10.4 Estrategia de Auditoria

- Tabla `audit_logs` para toda accion relevante (CRUD sobre entidades criticas).
- Capturar: quien, que, cuando, donde (IP), valores antes/despues.
- Indices por tenant_id + created_at para consultas rapidas.
- Retencion: minimo 1 ano, configurable.
- Super Admin puede consultar auditoria global; Admin de institucion solo la suya.

### 10.5 Estrategia de Eliminacion/Archivado

- **Soft delete** por defecto: columna `deleted_at` en entidades criticas.
- Nunca eliminar fisicamente usuarios, tareas, comunicaciones o entregas.
- **Hard delete** solo para datos temporales (tokens expirados, notificaciones leidas antiguas).
- Politica de retencion configurable por tenant.

---

## 11. ARQUITECTURA API

### 11.1 Convenciones

- **Estilo**: RESTful API
- **Versionado**: `/api/v1/...`
- **Formato**: JSON
- **Autenticacion**: Bearer Token (JWT)
- **Codigos HTTP**: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable), 429 (Rate Limited), 500 (Internal Error)
- **Paginacion**: Query params `?page=1&limit=20` -> respuesta con `{ data: [], meta: { total, page, limit, pages } }`
- **Filtrado**: `?status=published&priority=alta`
- **Ordenamiento**: `?sort=-due_date,created_at` (prefijo `-` para descendente)
- **Busqueda**: `?search=ejercicio`
- **Idempotencia**: Header `X-Idempotency-Key` para creaciones criticas
- **Rate limiting**: 100 req/min por usuario (configurable por tenant)
- **Documentacion**: OpenAPI 3.0 (Swagger)

### 11.2 Principales Endpoints

#### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
PUT    /api/v1/auth/change-password
```

#### Tenants
```
GET    /api/v1/tenants              (Super Admin)
POST   /api/v1/tenants              (Super Admin)
GET    /api/v1/tenants/:id
PUT    /api/v1/tenants/:id          (Admin)
```

#### Users
```
GET    /api/v1/users                (Admin: lista del tenant)
POST   /api/v1/users                (Admin: crear usuario)
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id            (soft delete)
GET    /api/v1/users/me             (perfil propio)
PUT    /api/v1/users/me             (actualizar perfil)
```

#### Academic
```
GET/POST       /api/v1/grades
GET/PUT/DELETE /api/v1/grades/:id

GET/POST       /api/v1/courses
GET/PUT/DELETE /api/v1/courses/:id

GET/POST       /api/v1/subjects
GET/PUT/DELETE /api/v1/subjects/:id

GET/POST       /api/v1/enrollments
GET/PUT/DELETE /api/v1/enrollments/:id

GET/POST       /api/v1/teacher-assignments
GET/PUT/DELETE /api/v1/teacher-assignments/:id

GET/POST       /api/v1/guardian-students
DELETE         /api/v1/guardian-students/:id
```

#### Schedule
```
GET/POST       /api/v1/schedules
GET/PUT/DELETE /api/v1/schedules/:id
GET            /api/v1/schedules/student/:studentId
GET            /api/v1/schedules/teacher/:teacherId
```

#### Tasks
```
GET/POST       /api/v1/tasks
GET/PUT        /api/v1/tasks/:id
DELETE         /api/v1/tasks/:id
POST           /api/v1/tasks/:id/publish
GET            /api/v1/tasks/:id/submissions
POST           /api/v1/tasks/:id/submit           (estudiante entrega)
GET            /api/v1/tasks/:id/submissions/:sid
PUT            /api/v1/tasks/:id/submissions/:sid  (docente revisa)
```

#### Communications
```
GET/POST       /api/v1/communications
GET/PUT        /api/v1/communications/:id
POST           /api/v1/communications/:id/read
GET            /api/v1/communications/:id/recipients
```

#### Signatures
```
GET/POST       /api/v1/signatures
GET            /api/v1/signatures/:id
POST           /api/v1/signatures/:id/sign
GET            /api/v1/signatures/pending
```

#### Notifications
```
GET            /api/v1/notifications
PUT            /api/v1/notifications/:id/read
POST           /api/v1/notifications/read-all
GET            /api/v1/notifications/unread-count
POST           /api/v1/notifications/register-device  (registrar token push)
```

#### Files
```
POST           /api/v1/files/upload
GET            /api/v1/files/:id
GET            /api/v1/files/:id/download
DELETE         /api/v1/files/:id
```

#### Dashboard
```
GET            /api/v1/dashboard/admin
GET            /api/v1/dashboard/teacher
GET            /api/v1/dashboard/parent/:studentId
GET            /api/v1/dashboard/student
```

#### Audit (Solo admin y super admin)
```
GET            /api/v1/audit-logs
GET            /api/v1/audit-logs/:id
```

### 11.3 Manejo de Errores

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "error": "Unprocessable Entity",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "due_date", "message": "Must be in the future" }
  ],
  "timestamp": "2026-08-20T12:00:00.000Z",
  "path": "/api/v1/tasks"
}
```

### 11.4 Firma Electronica - Analisis

| Nivel | Tipo | Alcance legal | Implementacion MVP |
|---|---|---|---|
| 1 | Confirmacion de lectura | Bajo - Solo registra que vio el contenido | Si |
| 2 | Aceptacion/Confirmacion | Medio - Registra consentimiento con timestamp + IP + user-agent | Si |
| 3 | Firma electronica | Alto - Equivale a firma manuscrita (varia por pais) | No - Fase 2 |
| 4 | Firma digital certificada | Muy alto - Certificado digital autorizado | No - Fase 3 |

**Para MVP**: Nivel 2 (Aceptacion). Se registra:
- Usuario que firma
- Fecha/hora exacta (UTC)
- IP del dispositivo
- User-agent del navegador/app
- Evidencia: hash SHA-256 de la accion + timestamp
- Almacenamiento en `signatures` con campos `ip_address` y `user_agent`

**Nota legal**: La validez juridica de la firma electronica varia por pais. Se recomienda asesoria juridica antes de operar.

---

## 12. ROLES Y MATRIZ DE PERMISOS

### 12.1 Roles del Sistema

| Rol | Scope | Descripcion |
|---|---|---|
| super_admin | Global (todos los tenants) | Administrador de la plataforma SaaS |
| admin | Tenant | Administrador de la institucion |
| docente | Tenant | Profesor asignado a cursos |
| estudiante | Tenant | Alumno matriculado |
| padre | Tenant | Padre/madre/acudiente |

### 12.2 Matriz de Permisos

| Modulo | Permiso | super_admin | admin | docente | estudiante | padre |
|---|---|---|---|---|---|---|
| **Tenants** | read | Si | Si (propio) | No | No | No |
| | create | Si | No | No | No | No |
| | update | Si | Si (propio) | No | No | No |
| **Users** | read | Si | Si (tenant) | Limitado | No | No |
| | create | Si | Si | No | No | No |
| | update | Si | Si | Si (perfil) | Si (perfil) | Si (perfil) |
| | delete | Si | Si | No | No | No |
| **Grades** | CRUD | Si | Si | No | No | No |
| **Courses** | read | Si | Si | Si (asignados) | Si (propio) | Si (hijos) |
| | create/update/delete | Si | Si | No | No | No |
| **Subjects** | read | Si | Si | Si (asignadas) | Si (propio) | Si (hijos) |
| | create/update/delete | Si | Si | No | No | No |
| **Students** | read | Si | Si | Si (cursos) | Si (propio) | Si (hijos) |
| | create/update | Si | Si | No | No | No |
| **Enrollments** | CRUD | Si | Si | No | No | No |
| **Schedules** | read | Si | Si | Si (propio) | Si (propio) | Si (hijos) |
| | create/update/delete | Si | Si | No | No | No |
| **Tasks** | read | Si | Si | Si (creadas) | Si (asignadas) | Si (hijos) |
| | create | Si | Si | Si | No | No |
| | update | Si | Si | Si (propias) | No | No |
| | delete | Si | Si | Si (propias) | No | No |
| **Task Submissions** | read | Si | Si | Si (cursos) | Si (propia) | Si (hijo) |
| | create | No | No | No | Si | No |
| | update (review) | Si | Si | Si | No | No |
| **Communications** | read | Si | Si | Si (recibidas) | Si (recibidas) | Si (recibidas) |
| | create | Si | Si | Si | No | Si (a docentes) |
| | send_bulk | Si | Si | No | No | No |
| **Signatures** | read | Si | Si | Si (propias) | No | Si (propias) |
| | request | Si | Si | Si | No | No |
| | sign | Si | Si | No | No | Si |
| **Notifications** | read | Si | Si | Si | Si | Si |
| | preferences | Si | Si | Si | Si | Si |
| **Audit** | read | Si | Si (tenant) | No | No | No |
| **Files** | upload | Si | Si | Si | Si | Si |
| | read/download | Si | Si | Si (propio) | Si (asignado) | Si (hijo) |

---

## 13. MAPA DE NAVEGACION

### 13.1 Administrador

```
Login
  +-- Seleccion de Institucion
  +-- Dashboard Admin
      +-- Resumen: estudiantes, docentes, cursos, actividad
      +-- Accesos rapidos: crear tarea, enviar comunicado
  +-- Gestion Academica
      +-- Grados -> Cursos -> Estudiantes
      +-- Asignaturas
      +-- Docentes -> Asignacion docente-curso
      +-- Padres -> Vinculacion padre-estudiante
      +-- Matriculas
  +-- Horarios
      +-- Vista semanal por curso
      +-- Crear/editar horarios
  +-- Todas las Tareas
      +-- Filtro por curso/estado/fecha
  +-- Comunicaciones
      +-- Enviar comunicado masivo
      +-- Historial de comunicaciones
  +-- Reportes
      +-- Asistencia (Fase 2)
      +-- Tareas
      +-- Actividad
  +-- Configuracion
      +-- Institucion
      +-- Periodos academicos
      +-- Roles/Permisos
  +-- Auditoria
  +-- Perfil
```

### 13.2 Docente

```
Login
  +-- Dashboard Docente
      +-- Proximas clases (hoy)
      +-- Tareas pendientes de revision
      +-- Mensajes sin leer
      +-- Firmas pendientes
  +-- Mi Horario
  +-- Mis Cursos
      +-- [Curso] -> Estudiantes
  +-- Tareas
      +-- Crear tarea
      +-- Mis tareas (filtro por curso/estado)
      +-- [Tarea] -> Entregas -> Revisar
  +-- Comunicaciones
      +-- Nuevo mensaje (a padre de mis cursos)
      +-- Bandeja de entrada
      +-- Enviados
  +-- Firmas
      +-- Solicitar firma
      +-- Pendientes
      +-- Completadas
  +-- Notificaciones
  +-- Perfil
```

### 13.3 Padre

```
Login
  +-- Seleccion de hijo (si tiene varios)
  +-- Dashboard Padre
      +-- Resumen del hijo seleccionado
      +-- Tareas pendientes
      +-- Firmas pendientes
      +-- Mensajes sin leer
  +-- Agenda
      +-- Vista dia/semana
      +-- Tareas, eventos, comunicaciones
  +-- Tareas del hijo
      +-- Pendientes
      +-- Entregadas
      +-- Vencidas
  +-- Horario del hijo
  +-- Comunicaciones
      +-- Nuevo mensaje (a docente del hijo)
      +-- Bandeja de entrada
  +-- Firmas
      +-- Pendientes
      +-- Historial
  +-- Notificaciones
  +-- Perfil
```

### 13.4 Estudiante (Primaria - Simplificado)

```
Login
  +-- Dashboard Estudiante
      +-- Mi proxima clase
      +-- Mis tareas pendientes (iconos grandes)
      +-- Mensajes
  +-- Mi Agenda (vista dia - visual)
      +-- Clases de hoy
      +-- Tareas de hoy
      +-- Recordatorios
  +-- Mis Tareas
      +-- Pendientes
      +-- Entregadas
  +-- Mis Comunicaciones
  +-- Mi Horario
  +-- Notificaciones
  +-- Perfil
```

### 13.5 Estudiante (Bachillerato - Completo)

```
Login
  +-- Dashboard Estudiante
      +-- Proxima clase
      +-- Tareas proximas a vencer
      +-- Entregas recientes
      +-- Eventos
      +-- Mensajes
  +-- Agenda (dia/semana/mes)
  +-- Tareas
      +-- Todas / Pendientes / Entregadas / Vencidas
      +-- [Tarea] -> Detalle + Entregar
  +-- Horario
  +-- Comunicaciones
  +-- Eventos
  +-- Notificaciones
  +-- Perfil
```

---

## 14. FLUJOS PRINCIPALES

### 14.1 Flujo: Crear Tarea (Docente)

```
1. Docente accede a "Tareas"
2. Hace clic en "Crear tarea"
3. Completa formulario:
   - Asignatura (select, auto-seleccionada si tiene una)
   - Titulo
   - Descripcion (texto enriquecido)
   - Fecha de entrega
   - Prioridad
   - Archivos adjuntos (opcional)
   - Enlaces (opcional)
4. Selecciona destinatarios:
   - Opcion A: Curso completo (select de sus cursos)
   - Opcion B: Estudiantes especificos (multi-select)
5. Estado inicial: "Borrador"
6. Puede "Guardar borrador" o "Publicar"
7. Al publicar:
   - Estado -> "Publicada"
   - Se crean registros en task_assignments
   - Se crean task_submissions (status=pending) para cada estudiante
   - Se envia notificacion a estudiantes y padres
8. La tarea aparece en la agenda del estudiante
```

### 14.2 Flujo: Entregar Tarea (Estudiante)

```
1. Estudiante ve tarea pendiente en agenda/dashboard
2. Hace clic en la tarea
3. Ve detalle: titulo, descripcion, fecha limite, archivos del docente
4. Hace clic en "Entregar"
5. Puede:
   - Escribir notas/respuesta
   - Adjuntar archivos
6. Confirma entrega
7. Estado de submission -> "submitted"
8. Fecha de entrega registrada
9. Docente recibe notificacion
10. Tarea aparece como "Entregada" en la agenda
```

### 14.3 Flujo: Enviar Comunicacion Padre -> Docente

```
1. Padre selecciona hijo (si tiene varios)
2. Accede a "Comunicaciones"
3. Hace clic en "Nuevo mensaje"
4. Selecciona destinatario:
   - Lista de docentes asignados al curso del hijo
   - O selecciona "Docente de [asignatura]"
5. Escribe asunto y mensaje
6. Puede adjuntar archivos
7. Envia
8. Comunicacion registrada con estado "enviado"
9. Docente recibe notificacion
10. El mensaje aparece en la bandeja del docente
```

### 14.4 Flujo: Firmar Comunicacion

```
1. Padre recibe notificacion "Firma pendiente"
2. Accede a la comunicacion con firma requerida
3. Ve el contenido de la comunicacion
4. Hace clic en "Firmar"
5. Ve resumen:
   - Documento/comunicacion
   - Fecha de solicitud
   - Solicitante
6. Confirma firma
7. El sistema registra:
   - Fecha/hora exacta
   - IP del dispositivo
   - User-agent
   - Hash de la accion
8. Estado -> "Firmado"
9. Docente ve confirmacion de firma
10. Historial de firma consultable
```

### 14.5 Flujo: Registrar Asistencia (Fase 2)

```
1. Docente accede a su curso
2. Selecciona "Tomar asistencia"
3. Ve lista de estudiantes con opciones:
   - Presente (preseleccionado)
   - Ausente
   - Excusa
   - Retardo
4. Marca inasistencias/excusas
5. Confirma
6. Registros creados para el dia
7. Padres de ausentes reciben notificacion
8. Historial consultable
```

### 14.6 Flujo: Consultar Agenda

```
1. Usuario se autentica
2. Selecciona institucion (si tiene varias)
3. Accede a "Agenda"
4. Vista por defecto: dia actual
5. Puede cambiar a: semana / mes
6. Ve filtrado segun su rol:
   - Estudiante: sus tareas, horario, comunicaciones, eventos
   - Padre: tareas/horario del hijo seleccionado
   - Docente: sus clases, tareas creadas, comunicaciones
7. Cada item es clickeable para ver detalle
8. Navegacion: dia anterior/siguiente
```

---

## 15. UX/UI

### 15.1 Principios de Diseno

1. **Mobile-first**: disenar para movil primero, despues adaptar a desktop.
2. **Responsive**: funciona en cualquier tamano de pantalla.
3. **Accesible**: contraste suficiente, texto legible, navegacion por teclado.
4. **Minimalista**: solo lo necesario en pantalla.
5. **Intuitivo**: sin necesidad de manuales.
6. **Consistente**: mismos patrones en todas las vistas.
7. **Pocos pasos**: accion principal en maximo 3 clics.
8. **Feedback inmediato**: loading states, confirmaciones, errores claros.

### 15.2 Pantallas Principales

| Pantalla | Roles | Prioridad |
|---|---|---|
| Login | Todos | P0 |
| Seleccion Institucion | Todos (multi-tenant) | P0 |
| Dashboard Admin | Admin | P0 |
| Dashboard Docente | Docente | P0 |
| Dashboard Padre | Padre | P0 |
| Dashboard Estudiante | Estudiante | P0 |
| Agenda (dia/semana/mes) | Todos | P0 |
| Crear Tarea | Docente, Admin | P0 |
| Lista de Tareas | Todos | P0 |
| Detalle de Tarea | Todos | P0 |
| Entregar Tarea | Estudiante | P0 |
| Comunicaciones (bandeja) | Todos | P0 |
| Enviar Comunicacion | Todos (con permisos) | P0 |
| Firmas Pendientes | Padre, Docente | P0 |
| Horario | Todos | P0 |
| Gestion Academica | Admin | P0 |
| Configuracion | Admin | P1 |
| Perfil | Todos | P1 |
| Notificaciones | Todos | P1 |
| Reportes | Admin | P2 |
| Auditoria | Admin, Super Admin | P2 |

### 15.3 Paleta de Colores (sugerencia)

- **Primario**: #2563EB (azul - confianza, educacion)
- **Secundario**: #10B981 (verde - positivo, confirmacion)
- **Acento**: #F59E0B (amarillo - alertas, prioridad)
- **Error**: #EF4444 (rojo)
- **Texto**: #1F2937 (gris oscuro)
- **Fondo**: #F9FAFB (gris claro)
- **Blanco**: #FFFFFF

**Personalizacion por tenant**: Cada institucion puede definir su color primario y logo.

### 15.4 Design System (Componentes)

- Button (primary, secondary, danger, ghost)
- Input (text, email, password, number, date, textarea, select, multi-select)
- Card
- Modal
- Toast/Alert
- Badge (status indicators)
- Avatar
- Skeleton loader
- Tab navigation
- Bottom navigation (mobile)
- Header/Toolbar
- Sidebar (desktop)
- Date picker
- Time picker
- File upload
- Rich text editor (tareas/comunicaciones)

---

## 16. MVP (FASE 1)

### 16.1 Que SI entra en el MVP

| Modulo | Funcionalidades |
|---|---|
| Auth | Login, logout, recuperacion contrasena, cambio contrasena, perfil |
| Instituciones | CRUD, configuracion basica (logo, nombre, colores) |
| Usuarios | CRUD, roles (admin, docente, estudiante, padre) |
| Academico | Grados, cursos, asignaturas, estudiantes, padres, docentes, matriculas, vinculaciones |
| Horarios | CRUD de horarios, vista por estudiante/docente |
| Agenda | Vista dia/semana/mes, filtrada por rol y tenant |
| Tareas | CRUD, publicacion, asignacion, estados, entregas, revision |
| Comunicaciones | Mensajes individuales (padre-docente), historial |
| Firmas | Solicitud, confirmacion, registro de evidencia |
| Notificaciones | In-app + push (Firebase FCM) |
| Dashboard | 4 dashboards (admin, docente, padre, estudiante) |
| Archivos | Upload/download de archivos adjuntos |

### 16.2 Que NO entra en el MVP

| Funcionalidad | Fase | Razon |
|---|---|---|
| Asistencia | Fase 2 | No critico para validacion inicial |
| Calendario institucional | Fase 2 | Puede resolverlo con agenda basica |
| Reportes avanzados | Fase 2 | Los dashboards basicos cubren MVP |
| Calificaciones numericas | Fase 2 | Los estados de tarea son suficientes |
| Comunicaciones masivas | Fase 2 | Las individuales cubren necesidad basica |
| Chat en tiempo real | Fase 3 | La mensajeria asincrona es suficiente |
| MFA | Fase 2 | Deseable pero no bloqueante |
| Integraciones externas | Fase 3 | Preparar API pero no implementar |
| Modo offline | Fase 3 | Complejidad alta, bajo impacto MVP |
| Analitica/IA | Fase 3 | Futuro |
| Transporte/pagos | Fase 3 | Futuro |

---

## 17. ROADMAP

### Fase 1: MVP (Semanas 1-12)

| Sprint | Contenido |
|---|---|
| Sprint 1-2 | Setup proyecto, Auth, Tenants, Users, Roles |
| Sprint 3-4 | Academico: Grados, Cursos, Asignaturas, Estudiantes, Padres, Docentes |
| Sprint 5-6 | Matriculas, Vinculaciones, Horarios |
| Sprint 7-8 | Tareas: CRUD, publicacion, asignacion, entregas |
| Sprint 9-10 | Comunicaciones, Firmas, Notificaciones |
| Sprint 11 | Dashboard, Agenda completa |
| Sprint 12 | Testing E2E, bug fixes, preparacion despliegue |

### Fase 2: Consolidacion (Semanas 13-20)

| Sprint | Contenido |
|---|---|
| Sprint 13-14 | Asistencia |
| Sprint 15-16 | Calendario, Eventos |
| Sprint 17-18 | Reportes, Estadisticas, Calificaciones |
| Sprint 19-20 | MFA, Comunicaciones masivas, Mejoras UX |

### Fase 3: Expansion (Semanas 21-30)

| Sprint | Contenido |
|---|---|
| Sprint 21-22 | Integraciones (Google Classroom, Teams) |
| Sprint 23-24 | Chat en tiempo real |
| Sprint 25-26 | Analitica, Prediccion |
| Sprint 27-28 | Transporte, Pagos |
| Sprint 29-30 | IA, Automatizaciones |

---

## 18. EPICAS E HISTORIAS DE USUARIO

### Epica 1: Autenticacion y Acceso

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-001 | Como usuario, quiero iniciar sesion con email y contrasena para acceder a la plataforma | Todos | Must | S |
| EU-002 | Como usuario, quiero recuperar mi contrasena por email si la olvido | Todos | Must | S |
| EU-003 | Como usuario, quiero cerrar sesion para proteger mi cuenta | Todos | Must | XS |
| EU-004 | Como usuario con multiples instituciones, quiero seleccionar a cual entrar | Todos | Must | M |
| EU-005 | Como usuario, quiero cambiar mi contrasena desde mi perfil | Todos | Must | S |
| EU-006 | Como usuario, quiero actualizar mi perfil (nombre, foto, telefono) | Todos | Must | S |

**Criterios de aceptacion EU-001:**

```
Given que el usuario esta en la pantalla de login
When ingresa email valido y contrasena correcta
Then se autentica y redirige al dashboard de su rol

Given que el usuario ingresa credenciales incorrectas
When hace clic en "Iniciar sesion"
Then ve mensaje de error "Credenciales incorrectas"
And no se crea sesion

Given que el usuario tiene MFA habilitado
When ingresa credenciales correctas
Then se le solicita codigo MFA
And solo accede tras verificar el codigo
```

### Epica 2: Gestion de Instituciones

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-010 | Como Super Admin, quiero crear una institucion para habilitarla en la plataforma | Super Admin | Must | M |
| EU-011 | Como Admin, quiero configurar el logo, nombre y colores de mi institucion | Admin | Must | S |
| EU-012 | Como Admin, quiero gestionar periodos academicos para delimitar el ano escolar | Admin | Must | M |

### Epica 3: Gestion Academica

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-020 | Como Admin, quiero crear grados para organizar la estructura academica | Admin | Must | S |
| EU-021 | Como Admin, quiero crear cursos dentro de un grado con seccion y ano | Admin | Must | S |
| EU-022 | Como Admin, quiero registrar estudiantes con sus datos personales | Admin | Must | M |
| EU-023 | Como Admin, quiero registrar padres y vincularlos a sus hijos | Admin | Must | M |
| EU-024 | Como Admin, quiero registrar docentes y asignarlos a cursos/asignaturas | Admin | Must | M |
| EU-025 | Como Admin, quiero matricular estudiantes en cursos para el ano academico | Admin | Must | M |
| EU-026 | Como Admin, quiero gestionar asignaturas disponibles en la institucion | Admin | Must | S |

### Epica 4: Horarios

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-030 | Como Admin, quiero definir horarios por curso/asignatura/docente/dia/hora | Admin | Must | L |
| EU-031 | Como estudiante, quiero ver mi horario semanal personalizado | Estudiante | Must | M |
| EU-032 | Como docente, quiero ver mi horario semanal con todos mis cursos | Docente | Must | M |

### Epica 5: Agenda Digital

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-040 | Como estudiante, quiero ver mi agenda del dia con tareas, horario y comunicaciones | Estudiante | Must | L |
| EU-041 | Como estudiante, quiero navegar entre dias/semana/mes en mi agenda | Estudiante | Must | M |
| EU-042 | Como padre, quiero ver la agenda de mi hijo seleccionado | Padre | Must | L |
| EU-043 | Como docente, quiero ver mi agenda con clases y tareas creadas | Docente | Must | L |

### Epica 6: Tareas

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-050 | Como docente, quiero crear una tarea con titulo, descripcion, fechas y archivos | Docente | Must | L |
| EU-051 | Como docente, quiero asignar una tarea a un curso completo o a estudiantes especificos | Docente | Must | M |
| EU-052 | Como docente, quiero publicar una tarea para que sea visible en agendas | Docente | Must | S |
| EU-053 | Como docente, quiero ver el estado de entrega de cada estudiante para una tarea | Docente | Must | M |
| EU-054 | Como estudiante, quiero ver mis tareas pendientes y vencidas | Estudiante | Must | M |
| EU-055 | Como estudiante, quiero entregar una tarea adjuntando archivos | Estudiante | Must | M |
| EU-056 | Como padre, quiero ver las tareas de mi hijo | Padre | Must | M |
| EU-057 | Como docente, quiero marcar una tarea como revisada tras evaluar entregas | Docente | Should | S |

### Epica 7: Comunicaciones

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-060 | Como padre, quiero enviar un mensaje a un docente de mi hijo | Padre | Must | M |
| EU-061 | Como docente, quiero enviar un mensaje a los padres de un curso | Docente | Must | M |
| EU-062 | Como usuario, quiero ver mi bandeja de entrada de comunicaciones | Todos | Must | M |
| EU-063 | Como usuario, quiero ver si un mensaje fue leido | Docente, Admin | Should | S |

### Epica 8: Firmas

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-070 | Como docente, quiero solicitar firma/confirmacion a un padre sobre una comunicacion | Docente | Must | M |
| EU-071 | Como padre, quiero ver las firmas pendientes y firmarlas | Padre | Must | M |
| EU-072 | Como docente, quiero ver el estado de firmas solicitadas | Docente | Must | S |

### Epica 9: Notificaciones

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-080 | Como usuario, quiero recibir notificaciones in-app de nuevas tareas y mensajes | Todos | Must | M |
| EU-081 | Como usuario, quiero recibir notificaciones push en mi dispositivo movil | Todos | Must | L |
| EU-082 | Como usuario, quiero configurar mis preferencias de notificacion | Todos | Should | S |

### Epica 10: Dashboard

| ID | Historia | Actor | Prioridad | Complejidad |
|---|---|---|---|---|
| EU-090 | Como Admin, quiero ver un dashboard con estadisticas de la institucion | Admin | Must | M |
| EU-091 | Como docente, quiero ver un dashboard con mis proximas clases y tareas | Docente | Must | M |
| EU-092 | Como padre, quiero ver un dashboard con resumen de mis hijos | Padre | Must | M |
| EU-093 | Como estudiante, quiero ver un dashboard con mis tareas y proxima clase | Estudiante | Must | M |

---

## 19. CRITERIOS DE ACEPTACION (Funcionalidades Criticas)

### Login (EU-001)

```
Given que el usuario no esta autenticado
When accede a cualquier ruta protegida
Then se redirige a /login

Given que el usuario esta en /login
When ingresa credenciales validas
Then se genera access token + refresh token
And se redirige a /dashboard
And el token se almacena de forma segura

Given que el usuario esta en /login
When ingresa credenciales invalidas
Then se muestra error "Credenciales incorrectas"
And permanece en /login
And no se crea sesion
```

### Crear Tarea (EU-050)

```
Given que el docente esta en "Crear tarea"
When completa todos los campos obligatorios y selecciona destinatarios
And hace clic en "Publicar"
Then se crea la tarea con estado "published"
And se generan submissions para cada estudiante destinatario
And se envian notificaciones a estudiantes y padres
And la tarea aparece en las agendas correspondientes

Given que el docente esta en "Crear tarea"
When no completa campos obligatorios
And hace clic en "Publicar"
Then se muestran errores de validacion
And no se crea la tarea
```

### Entregar Tarea (EU-055)

```
Given que el estudiante ve una tarea pendiente
When hace clic en "Entregar"
And adjunta archivos y/o escribe notas
And confirma la entrega
Then el estado de submission cambia a "submitted"
And se registra la fecha de entrega
And el docente recibe notificacion
```

### Enviar Comunicacion (EU-060)

```
Given que el padre selecciona un docente destinatario
When escribe asunto y mensaje
And hace clic en "Enviar"
Then se crea la comunicacion
And se registra el envio
And el docente recibe notificacion
And el mensaje aparece en la bandeja del docente

Given que el padre intenta enviar mensaje a un docente que no esta asignado a sus hijos
Then el sistema rechaza la operacion
And muestra error "No tiene autorizacion para contactar a este docente"
```

### Firmar (EU-071)

```
Given que el padre tiene una firma pendiente
When accede a la comunicacion
And hace clic en "Firmar"
Then se registra: fecha/hora, IP, user-agent
And el estado cambia a "signed"
And el solicitante recibe confirmacion
And la firma es consultable en historial
```

---

## 20. ESTRATEGIA DE TESTING

### 20.1 Niveles de Prueba

| Tipo | Cobertura MVP | Herramienta |
|---|---|---|
| Unit Testing | 70% codigo business logic | Jest (backend), Vitest (frontend) |
| Integration Testing | Todas las APIs criticas | Supertest + Jest |
| API Testing | Endpoints REST completos | Postman/Newman (collections) |
| E2E Testing | Flujos criticos (login, crear tarea, entregar, comunicar, firmar) | Playwright (web), Appium (mobile) |
| Mobile Testing | Funcionalidad basica en Android/iOS | Flutter test + Appium |
| Accessibility Testing | WCAG 2.1 AA basico | axe-core, Lighthouse |
| Performance Testing | APIs criticas | k6 o Artillery |
| Security Testing | OWASP Top 10 | OWASP ZAP, npm audit |
| Regression Testing | Todo el suite automatizado | CI pipeline |

### 20.2 Cobertura Minima MVP

- Unit tests: 70% en modulos de negocio
- Integration tests: 100% de endpoints criticos (auth, tasks, communications, signatures)
- E2E tests: 10 flujos principales automatizados
- Security scan: sin vulnerabilidades criticas ni altas

### 20.3 Estrategia de Datos de Prueba

- **Seed scripts** para crear datos ficticios de prueba.
- **Nunca** usar datos reales de estudiantes en desarrollo/testing.
- Cada ambiente de test tiene su propia BD con datos seed.
- Los datos seed incluyen: 1 tenant, 2 grados, 4 cursos, 20 estudiantes, 10 padres, 8 docentes, asignaturas, horarios, tareas de ejemplo.

---

## 21. SEGURIDAD

### 21.1 Arquitectura de Seguridad

```
+------------------+     +------------------+     +------------------+
|   App Movil/Web  | --> |   API Gateway    | --> |   Backend API    |
|   (TLS 1.2+)     |     |   (Rate Limit)   |     |   (JWT + RBAC)   |
+------------------+     +------------------+     +------------------+
                                |                          |
                                v                          v
                         +------------------+     +------------------+
                         |   WAF (Cloudflare)|     |   PostgreSQL     |
                         |   DDoS Protection |     |   (AES-256)      |
                         +------------------+     +------------------+
```

### 21.2 Controles Implementados

| Control | Implementacion |
|---|---|
| Autenticacion | JWT (access 15min + refresh 7d) con RS256 |
| Password hashing | bcrypt (cost factor 12) |
| RBAC | Guards en NestJS con decoradores @Roles |
| Tenant isolation | Middleware + Query Builder con tenant_id |
| Rate limiting | 100 req/min por usuario (Redis) |
| CORS | Whitelist de origenes configurables |
| Helmet | Headers de seguridad HTTP |
| Input validation | class-validator + class-transformer |
| SQL Injection | TypeORM query builder (parameterized) |
| XSS | Sanitizacion de input + output encoding |
| CSRF | SameSite cookies + token (si aplica) |
| Secrets | AWS Secrets Manager o .env (desarrollo) |
| Audit | Log de todas las acciones criticas |
| Session management | Refresh token rotation, revocacion |
| File uploads | Validacion de tipo y tamano, antivirus (Fase 2) |
| Encryption at rest | PostgreSQL TDE + S3 SSE |

### 21.3 Aspectos que Requieren Asesoria Juridica

1. **Cumplimiento de COPPA** (si opera en USA) o equivalente local.
2. **Consentimiento parental** para menores de 13-16 anos (varia por pais).
3. **Retencion de datos** y derecho al olvido (GDPR si aplica).
4. **Validez legal** de la firma electronica implementada.
5. **Almacenamiento transfronterizo** de datos personales de menores.
6. **Politica de privacidad** y terminos de servicio adaptados.
7. **Notificacion de brechas** de seguridad.

---

## 22. DEVOPS Y DESPLIEGUE

### 22.1 Ambientes

| Ambiente | Proposito | BD | Datos |
|---|---|---|---|
| Development | Desarrollo local | PostgreSQL local | Seed data |
| Testing | QA y pruebas automatizadas | RDS t3.micro | Seed data |
| Staging | Pre-produccion, UAT | RDS t3.small | Seed data + data real anonimizada |
| Production | Produccion | RDS t3.medium+ | Datos reales |

### 22.2 Git Workflow

```
main (produccion)
  +-- develop (integracion)
      +-- feature/EU-001-login
      +-- feature/EU-050-crear-tarea
      +-- fix/bug-123-login-error
```

- **Branches**: feature/, fix/, hotfix/, release/
- **PR**: obligatorio, require 1 review + CI verde
- **Merge**: squash & merge a develop
- **Release**: merge develop -> main con tag
- **Hotfix**: branch desde main -> merge a main + develop

### 22.3 CI/CD

```
Push/PR -> GitHub Actions
  +-- Lint (ESLint + Prettier)
  +-- Type Check (TypeScript)
  +-- Unit Tests (Jest)
  +-- Integration Tests (Supertest)
  +-- Build (Docker image)
  +-- Security Scan (npm audit)

Merge a develop -> Deploy a Staging (automatico)
Merge a main -> Deploy a Production (con aprobacion)
```

### 22.4 Infraestructura (AWS)

```
CloudFront (CDN) + Cloudflare (WAF)
  |
  v
ALB (Application Load Balancer)
  |
  v
ECS Fargate (Backend API - 2+ tareas)
  |
  +-- RDS PostgreSQL (Multi-AZ en produccion)
  +-- ElastiCache Redis
  +-- S3 (archivos)
  +-- SNS/SQS (notificaciones)
```

### 22.5 Docker

```dockerfile
# Backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 22.6 Migraciones de BD

- Usar TypeORM migrations (o Knex.js migrations).
- Cada cambio de schema es una migracion versionada.
- Migraciones automaticas en deploy a staging.
- Migraciones manuales con aprobacion en produccion.
- Backups automaticos antes de cada migracion en produccion.

### 22.7 Secrets Management

- **Desarrollo**: .env (nunca commiteado, en .gitignore)
- **Staging/Production**: AWS Secrets Manager o Parameter Store
- **CI/CD**: GitHub Secrets
- **Rotacion**: secrets rotation trimestral

---

## 23. OBSERVABILIDAD

### 23.1 Logs

- **Formato**: JSON estructurado
- **Niveles**: error, warn, info, debug
- **Campos minimos**: timestamp, level, message, requestId, tenantId, userId
- **Destino**: CloudWatch Logs (AWS) o stdout para container
- **Retencion**: 30 dias (configurable)
- **Herramienta de consulta**: CloudWatch Insights o Grafana Loki

### 23.2 Metricas

| Metrica | Descripcion |
|---|---|
| http_requests_total | Total de requests por endpoint, metodo, status |
| http_request_duration_seconds | Latencia de requests (P50, P95, P99) |
| db_query_duration_seconds | Duracion de queries a BD |
| active_users | Usuarios activos por tenant |
| notifications_sent_total | Notificaciones enviadas |
| task_submissions_total | Entregas de tareas |
| error_rate | Tasa de errores por endpoint |
| cpu_usage | Uso de CPU |
| memory_usage | Uso de memoria |
| disk_usage | Uso de disco (BD) |

### 23.3 Tracing

- **OpenTelemetry** para tracing distribuido.
- Correlacion por `requestId` unico en cada request.
- Span por cada operacion importante (auth, query, external call).

### 23.4 Alertas

| Alerta | Condicion | Severidad |
|---|---|---|
| API down | Health check falla 3 veces | Critica |
| Error rate alto | > 5% de requests con 5xx | Alta |
| Latencia alta | P95 > 500ms por 5 min | Media |
| CPU alto | > 80% por 10 min | Media |
| Disco bajo | < 20% libre | Alta |
| Backup fallido | Backup automatico falla | Critica |

### 23.5 Herramientas

- **Monitoreo**: Grafana + Prometheus (o AWS CloudWatch)
- **Errores**: Sentry (backend + frontend)
- **Logs**: CloudWatch Logs o Grafana Loki
- **Uptime**: BetterUptime o Checkly

---

## 24. BACKUPS Y DISASTER RECOVERY

### 24.1 Estrategia de Backups

| Recurso | Metodo | Frecuencia | Retencion | RPO |
|---|---|---|---|---|
| PostgreSQL | Automated snapshots + manual | Diario | 30 dias | < 1 hora (PITR) |
| PostgreSQL | WAL archiving | Continuo | 7 dias | 5 min |
| S3 Files | Versioning + replication | Continuo | Indefinido | 0 (eventual) |
| Redis | RDB + AOF | Cada hora | 7 dias | < 1 hora |
| Secrets | Secrets Manager versioning | Continuo | Indefinido | 0 |

### 24.2 RPO y RTO

| Parametro | MVP | Fase 2 |
|---|---|---|
| RPO (datos maximos perdidos) | < 1 hora | < 5 minutos |
| RTO (tiempo para restaurar) | < 4 horas | < 1 hora |

### 24.3 Procedimiento de Restauracion

1. Identificar punto de restauracion (timestamp).
2. Detener escrituras (si es necesario).
3. Restaurar BD desde snapshot + WAL.
4. Restaurar archivos desde S3 versioning.
5. Verificar integridad.
6. Actualizar DNS si es necesario.
7. Notificar a usuarios.

### 24.4 Disaster Recovery

- **Produccion**: Multi-AZ para RDS, S3 cross-region replication.
- **Backup region**: S3 bucket en region secundaria.
- **Documentacion**: Runbook de DR revisado trimestralmente.
- **Test**: Restore de backup mensual a ambiente de staging.

---

## 25. MATRIZ DE RIESGOS

| # | Riesgo | Probabilidad | Impacto | Nivel | Mitigacion |
|---|---|---|---|---|---|
| R01 | Brecha de datos de menores | Baja | Critico | **Alto** | RBAC estricto, encriptacion, auditoria, pentest trimestral, asesoria juridica |
| R02 | Incumplimiento normativa proteccion de menores | Media | Critico | **Critico** | Asesoria juridica desde Fase 1, diseno privacy-by-design |
| R03 | Fallo en multi-tenancy (data leak entre tenants) | Baja | Critico | **Alto** | Tests de aislamiento, middleware tenant_id obligatorio, code review estricto |
| R04 | Fallo de disponibilidad en hora pico (7-8am, 12-1pm, 5-7pm) | Media | Alto | **Alto** | Auto-scaling, CDN, cache, load testing previo |
| R05 | Push notifications fallan o no llegan | Media | Medio | **Medio** | Monitoreo de delivery, fallback a in-app, retry queue |
| R06 | Almacenamiento de archivos crece sin control | Media | Medio | **Medio** | Limites por tenant, politica de retencion, monitoreo |
| R07 | Lento crecimiento de usuarios | Alta | Medio | **Medio** | UX excepcional, onboarding guiado, soporte dedicado |
| R08 | Complejidad del MVP excede capacidad del equipo | Media | Alto | **Alto** | Fase 1 minimalista, MVP estricto, avoid over-engineering |
| R09 | Costos Cloud crecen rapido | Media | Medio | **Medio** | Monitoreo de costos, alerts, optimizacion, reserved instances |
| R10 | Migracion de datos desde sistemas existentes | Media | Medio | **Medio** | API de importacion CSV, tool de migracion, validacion |
| R11 | Performance de queries lentas con multi-tenancy | Media | Alto | **Alto** | Indices optimizados, EXPLAIN ANALYZE, read replicas |
| R12 | Adopcion baja por resistencia al cambio | Alta | Alto | **Alto** | UX superior, capacitacion, piloto con 1-3 colegios |
| R13 | Ausentismo del equipo de desarrollo | Media | Alto | **Alto** | Documentacion, pair programming, conocimiento compartido |
| R14 | Cambios de requisitos frecuentes | Alta | Medio | **Medio** | Metodologia agile, sprints cortos, backlog priorizado |

---

## 26. ESTIMACION DE COMPLEJIDAD

### Por Modulo (Escala: XS, S, M, L, XL)

| Modulo | Complejidad | Notas |
|---|---|---|
| Auth + Users + Roles | M | JWT, RBAC, tenant context |
| Tenants + Config | S | CRUD basico + settings |
| Academico (grados, cursos, asignaturas) | M | CRUD + relaciones |
| Estudiantes + Padres + Docentes | M | CRUD + vinculaciones N:N |
| Matriculas + Enrollments | S | Tabla de relacion |
| Horarios | L | Generacion, validacion de conflictos, vistas |
| Agenda Digital | L | Queries complejas, multiples fuentes, cache |
| Tareas + Entregas | L | CRUD, asignacion masiva, estados, notificaciones |
| Comunicaciones | M | Mensajeria, historial, estados |
| Firmas | M | Estados, evidencia, expiracion |
| Notificaciones | M | In-app + push + preferencias |
| Dashboard | M | Queries agregadas por rol |
| Archivos | S | Upload, download, S3 |
| Auditoria | S | Logging + consulta |
| Frontend Web (React) | XL | Todas las vistas, responsive |
| App Movil (Flutter) | XL | Todas las vistas, push, offline basics |
| Backend API (NestJS) | XL | Todos los modulos, middleware, guards |
| DevOps + CI/CD | M | Setup inicial + automatizacion |
| Testing | L | Unit + integration + E2E |
| Seed data | S | Scripts de datos de prueba |

### Estimacion General

- **MVP completo**: ~150-200 historias de usuario (contando sub-tareas tecnicas)
- **Equipo estimado**: 2 backend + 2 frontend/web + 1 mobile + 1 QA + 1 DevOps (parcial)
- **Duracion estimada MVP**: 10-14 semanas con equipo completo

---

## 27. PREGUNTAS QUE DEBEN RESOLVERSE ANTES DE DESARROLLAR

### Criticas (bloquean inicio del desarrollo)

| # | Pregunta | Bloquea |
|---|---|---|
| P-01 | En que pais se operara? | Arquitectura de datos, normativa, infraestructura |
| P-02 | Quien es el Super Admin inicial? Se requiere rol de plataforma desde el inicio? | Diseno de auth y tenancy |
| P-03 | Los estudiantes de primaria tendran cuenta propia o acceden solo via padre? | Diseno de auth, UX movil |
| P-04 | Proveedor cloud a utilizar? | Configuracion DevOps, costos |
| P-05 | Presupuesto mensual estimado para infraestructura? | Eleccion de tier de servicios |
| P-06 | Hay algun colegio piloto definido para validacion del MVP? | Priorizacion de features |

### Importantes (deben resolverse antes de la Fase 2)

| # | Pregunta |
|---|---|
| P-07 | Que tipo de archivos se permitiran adjuntar? Limites de tamano? |
| P-08 | Se requiere soporte para multiples anos academicos historicos? |
| P-09 | Cual es el modelo de negocio? Gratis, freemium, suscripcion? |
| P-10 | Se necesita panel de administracion de la plataforma (Super Admin)? |

---

## 28. RECOMENDACION FINAL

### Arquitectura Recomendada

- **Monolito modular** con NestJS (no microservicios para MVP).
- **Shared database** con tenant_id (no DB por institucion).
- **React + Vite** para web.
- **Flutter** para movil (Android + iOS).
- **PostgreSQL** como base de datos principal.
- **Redis** para cache, sesiones y colas.
- **AWS** como proveedor cloud.
- **Firebase FCM** para push notifications.
- **Cloudflare** para CDN y WAF.
- **Docker** + ECS Fargate para despliegue.

### Estrategia Recomendada

1. **MVP estricto**: solo lo necesario para validar con 1-3 colegios piloto.
2. **UX excepcional**: priorizar usabilidad sobre funcionalidad.
3. **Seguridad desde el inicio**: no parchar despues.
4. **Multi-tenancy desde la linea 1**: no refactorizar despues.
5. **Datos ficticios**: nunca datos reales en desarrollo.
6. **Iterar rapido**: sprints de 1-2 semanas, feedback continuo.
7. **Documentar decisiones**: cada decision tecnica importante documentada.
8. **Medir**: instrumentar desde el inicio para tomar decisiones basadas en datos.

### Proximo Paso

Esperar aprobacion de este documento para proceder con:
1. Setup del repositorio y proyecto base.
2. Configuracion de DevOps y CI/CD.
3. Desarrollo del Backend (Auth, Tenants, Users).
4. Desarrollo del Frontend (Login, Dashboard).
5. Iteracion continua con feedback.

---

**Fin del documento de Analisis y Arquitectura v1.0**

*Documento sujeto a revision y aprobacion antes del inicio del desarrollo.*
