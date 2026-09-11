# ROLE UX MATRIX — Agenda Escolar Digital

| Rol | Dashboard | Agenda | Menú | ChildContext | Datos | Notificaciones | Acciones |
|---|---|---|---|---|---|---|---|
| SUPER_ADMIN | Stats admin + seguimientos | Global | Full (sin módulos académicos) | No | Global | Todas | CRUD completo |
| INSTITUTION_ADMIN | Stats admin + compromisos | Global | Full | No | Global | Todas | CRUD completo |
| RECTOR | Stats admin | Global | Inicio + Gestión + Evaluación | No | Global | Todas | Lectura + gestión |
| COORDINADOR_ACADEMICO | Stats académico | Global | Gestión académica + Evaluación | No | Global | Todas | CRUD académico |
| COORDINADOR_CONVIVENCIA | Stats convivencia | Global | Convivencia + Comunicación | No | Alcance | Todas | CRUD convivencia |
| ORIENTADOR | Stats seguimientos | Global | Convivencia | No | Alcance | Todas | CRUD seguimientos |
| PSICOLOGO | Stats psicología | Global | Convivencia | No | Alcance | Todas | CRUD seguimientos |
| TEACHER | Stats cursos | Sus cursos/asignaciones | Inicio + Trabajo académico | No | Sus cursos | Todas | CRUD tareas/entregas |
| DIRECTOR_DE_GRUPO | Stats grupo | Grupo asignado | Inicio + Trabajo académico | No | Su grupo | Todas | CRUD tareas/entregas |
| PARENT | Hijo seleccionado | Hijo seleccionado | Inicio + Horarios + Notas | ✅ Selector | Solo hijos vinculados | Solo relevantes | Lectura + selección hijo |
| STUDENT | Sus datos | Sus actividades | Inicio + Trabajo académico | No | Solo él mismo | Solo relevantes | Entregas + lectura |

## Detalle por módulo

### Dashboard
- **ADMIN/RECTOR**: Estudiantes, Docentes, Cursos, Asignaturas, Seguimientos pendientes
- **COORDINADOR**: Similar a admin pero filtrado por área
- **TEACHER/DIRECTOR**: Cursos asignados, Estudiantes, Asignaturas
- **PARENT**: Hijos, AcademicDashboard con gráficos SVG
- **STUDENT**: Matrículas, Seguimientos

### Agenda
- **Todos**: 4 vistas (día, semana, mes, año)
- **PARENT**: Filtrada por hijo seleccionado
- **STUDENT**: Solo sus actividades
- **TEACHER**: Sus cursos/asignaciones

### Notificaciones
- **READ/UNREAD**: Estados funcionales
- **openedAt**: Tracking de primera apertura (nuevo)
- **readAt**: Tracking de marcado como leído
- **Tipos**: 8 (SIGNATURE_REQUEST, COMMUNICATION, TASK_UPDATE, etc.)

### Horarios
- **PARENT**: Filtrado por hijo, export PDF/Excel/Print
- **STUDENT**: Sus horarios
- **TEACHER**: Horarios de sus cursos
- **ADMIN**: Todos los horarios con gestión

### Entregas
- **STUDENT**: Subir archivos (PDF, DOC, DOCX, XLS, XLSX, etc.)
- **TEACHER**: Revisar entregas de su alcance
- **PARENT**: Solo lectura de entregas del hijo

### Seguridad
- **Backend**: PermissionGuard + TenantContextGuard + AcademicScope
- **Frontend**: usePermissions + useParentStudentFilter
- **Tenant**: Isolation por institución
- **IDOR/BOLA**: Protección en todos los endpoints
