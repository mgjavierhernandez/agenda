# PROMPT 109 — REDISEÑO FUNCIONAL DEL CATÁLOGO ACADÉMICO

> **Fecha:** 2026-09-04 · **Rama:** `main` · **HEAD:** `b1f1b86 docs(101)`

---

## 1. PROBLEMA ENCONTRADO

El flujo académico existía técnicamente (PROMPTs 102-107) pero la experiencia de usuario era **técnicamente funcional pero conceptualmente insuficiente** para un administrador de colegio:

- "Nueva asignatura" mostraba campos sueltos sin agrupación lógica
- El selector de área mostraba "Sin área" como única opción cuando no había áreas
- El listado de áreas no mostraba cantidad de asignaturas asociadas
- El detalle de asignatura no mostraba relaciones académicas (docentes/cursos)
- Falta de ayudas visuales que explicaran el propósito de cada campo

---

## 2. MODELO ACADÉMICO UTILIZADO

Se reutilizó la arquitectura existente sin crear nuevas entidades:

```
NIVELES EDUCATIVOS (EducationLevel enum)
    ↓
ÁREAS CURRICULARES (Area model)
    ↓
ASIGNATURAS (Subject model con areaId, subjectType, minimumLevel, maximumLevel)
    ↓
CURSOS / GRADOS (Course model)
    ↓
DOCENTES (User + UserRole TEACHER)
    ↓
ASIGNACIONES DOCENTES (TeacherAssignment)
    ↓
PERIODO ACADÉMICO (AcademicPeriod)
    ↓
ESTUDIANTES (Enrollment + Student)
```

**Niveles educativos (existentes):** PREESCOLAR, PRIMARIA, SECUNDARIA, MEDIA  
**Tipos de asignatura (existentes):** OBLIGATORIA, OPTATIVA, PROFUNDIZACION, TRANSVERSAL, DIMENSION

---

## 3. CAMBIOS REALIZADOS

### 3.1 SubjectFormPage — Formulario rediseñado con secciones conceptuales

**Archivo:** `apps/web/src/modules/subjects/pages/SubjectFormPage.tsx`

**Antes:** Campos sueltos sin agrupación

**Después:** 4 fieldsets con leyendas descriptivas:

```
┌─ SECCIÓN 1 — IDENTIFICACIÓN ─────────────────────┐
│ Código *  │ Nombre *  │ Descripción               │
└──────────────────────────────────────────────────┘

┌─ SECCIÓN 2 — CLASIFICACIÓN ACADÉMICA ────────────┐
│ Área curricular *  │ Tipo de asignatura *         │
└──────────────────────────────────────────────────┘

┌─ SECCIÓN 3 — NIVEL EDUCATIVO ────────────────────┐
│ Texto de ayuda: "Define el rango educativo..."   │
│ Nivel mínimo  │ Nivel máximo                     │
└──────────────────────────────────────────────────┘

┌─ SECCIÓN 4 — ESTADO ─────────────────────────────┐
│ Activo / Inactivo                                │
└──────────────────────────────────────────────────┘
```

**Mejoras clave en selector de Área:**
- Si hay áreas: dropdown con "Seleccionar área curricular" + lista
- Si NO hay áreas: estado disabled + mensaje "No hay áreas curriculares configuradas" + botón "crear un área curricular" que navega a `/areas`

**Validaciones mantenidas:**
- Área válida pertenece a la misma institución (backend)
- Nivel máximo no puede ser inferior al mínimo (frontend + backend)
- Código único por institución
- Todos los campos requeridos marcados con *

### 3.2 AreasPage — Listado con contador de asignaturas

**Archivo:** `apps/web/src/modules/areas/pages/AreasPage.tsx`

**Nueva columna:** "Asignaturas" que muestra `X asignatura(s)` por área

```typescript
const subjectCountByArea = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const subject of subjects) {
    if (subject.areaId) {
      counts[subject.areaId] = (counts[subject.areaId] || 0) + 1;
    }
  }
  return counts;
}, [subjects]);
```

**Tabla resultante:**
| Código | Nombre | Asignaturas | Tipo | Orden | Estado | Acciones |
|--------|--------|-------------|------|-------|--------|----------|
| ARE-MAT | Matemáticas | 3 asignaturas | Oficial | 0 | Activo | Editar / Desactivar |
| ARE-HUM | Humanidades | 2 asignaturas | Oficial | 1 | Activo | Editar / Desactivar |

### 3.3 SubjectDetailPage — Sección "Relaciones académicas"

**Archivo:** `apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx`

**Nueva sección** (solo visible si hay TeacherAssignments):

```
┌─ Relaciones académicas ─────────────────────────┐
│ Docentes asignados                               │
│ ├─ Docente (ID: abc123...)                       │
│ │   Cursos: curso1..., curso2...                 │
│ └─ Docente (ID: def456...)                       │
│     Cursos: curso3...                            │
│                                                 │
│ Cursos con esta asignatura                       │
│ ├─ Curso (ID: curso1...)                         │
│ │   Periodos: 2026-1, 2026-2                     │
│ └─ Curso (ID: curso2...)                         │
│     Periodos: 2026-1                             │
└─────────────────────────────────────────────────┘
```

Usa `useTeacherAssignments({ subjectId, limit: 100 })` y agrupa por docente y curso.

### 3.4 SubjectsPage — Filtro por área ya existente

**Archivo:** `apps/web/src/modules/subjects/pages/SubjectsPage.tsx`

Mantenido y verificado:
- Filtro "Área" usando `areaId` (no búsqueda textual)
- Columnas: Código, Nombre, **Área**, **Tipo**, **Nivel**, Estado
- Tarjetas móviles muestran misma información

**Nivel filter:** Documentado como GAP — requiere backend changes (no implementado en este prompt).

---

## 4. VERIFICACIÓN VISUAL EN LOCALHOST

| Criterio | Resultado |
|----------|-----------|
| `/areas` abre correctamente | ✅ |
| "Áreas" aparece en sidebar | ✅ |
| Se puede crear un área | ✅ |
| Se puede editar un área | ✅ |
| Se puede desactivar un área | ✅ |
| Listado muestra "Asignaturas" por área | ✅ |
| `/subjects` abre correctamente | ✅ |
| Nueva asignatura muestra secciones agrupadas | ✅ |
| Selector Área: mensaje útil si no hay áreas + link a /areas | ✅ |
| Selector Tipo: dropdown con labels legibles | ✅ |
| Selectores Nivel mínimo/máximo con ayuda visual | ✅ |
| Validación: nivel máximo ≥ nivel mínimo | ✅ |
| Se puede crear asignatura asociada a área | ✅ |
| Listado muestra Área, Tipo, Nivel | ✅ |
| Filtro por Área funcional | ✅ |
| Detalle muestra Área, Tipo, Nivel | ✅ |
| Detalle muestra "Relaciones académicas" | ✅ |
| `/teacher-assignments/new` selectores legibles | ✅ |
| `/teachers` muestra relaciones | ✅ |

---

## 5. RUNTIME DOCKER

```bash
# Rebuild frontend
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web

# Verificación
curl -s -o /dev/null -w "%{http_code}" http://localhost/areas     # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost/subjects   # 200
```

Bundle verificado: `index-C1bqDx9p.js` contiene "Clasificación académica", "Relaciones académicas", etc.

---

## 6. TESTS

| Suite | Resultado |
|-------|-----------|
| Web Vitest | **510/510 PASS** (64 archivos) |
| API E2E (areas/teachers/subjects) | **37/37 PASS** |
| Typecheck (`tsc --noEmit`) | ✅ |
| Web build (`vite build`) | ✅ |
| API build (`nest build`) | ✅ |
| Prisma validate | ✅ |

---

## 7. PRUEBA FUNCIONAL END-TO-END

**Ejecutada en `http://localhost`:**

1. **PASO 1** → `/areas` → "Nueva área" → Crear "Matemáticas" ✅
2. **PASO 2** → Crear "Humanidades" ✅
3. **PASO 3** → `/subjects/new` → MAT-001, Matemáticas, Área=Matemáticas, Tipo=Obligatoria, Nivel=Primaria-Media ✅
4. **PASO 4** → LEN-001, Lengua Castellana, Área=Humanidades, Tipo=Obligatoria, Nivel=Primaria-Media ✅
5. **PASO 5** → ING-001, Inglés, Área=Humanidades, Tipo=Obligatoria, Nivel=Primaria-Media ✅
6. **PASO 6** → `/subjects` → Verificar 3 asignaturas con área y nivel ✅
7. **PASO 7** → Filtrar por Humanidades → Ver Lengua Castellana, Inglés ✅
8. **PASO 8** → Filtrar por Matemáticas → Ver Matemáticas ✅
9. **PASO 9** → `/teacher-assignments/new` → Selectores legibles (Profesor, Curso, Asignatura, Periodo) ✅
10. **PASO 10** → Crear asignación: Profesor + Curso + Asignatura + Periodo ✅
11. **PASO 11** → `/teachers` → Ver docente → Matemáticas → Curso → Estudiantes ✅

---

## 8. ARCHIVOS MODIFICADOS

```
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx     # Formulario rediseñado 4 secciones
M apps/web/src/modules/areas/pages/AreasPage.tsx              # + contador asignaturas, fetch subjects
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx   # + Relaciones académicas (TeacherAssignment)
```

---

## 9. DOCUMENTACIÓN CREADA

```
?? docs/109-academic-curriculum-ux.md  (este archivo)
```

---

## 10. GAPS RESIDUALES

| Gap | Descripción | Acción |
|-----|-------------|--------|
| **Filtro por nivel educativo** | Backend no soporta `minimumLevel`/`maximumLevel` en `ListSubjectsQueryDto` | Requiere DTO + service + controller changes |
| **Detalle docente en Relaciones académicas** | Solo muestra ID truncado, no nombre/email | Requiere fetch users o extender TeacherAssignment response |
| **Director de Grupo ↔ Curso ↔ Periodo** | Fuera de alcance (PROMPT 105) | Pendiente |
| **TeacherAssignment startDate/endDate** | Fuera de alcance | Pendiente |

---

## 11. GIT STATE

```
M apps/web/src/modules/subjects/pages/SubjectFormPage.tsx
M apps/web/src/modules/areas/pages/AreasPage.tsx
M apps/web/src/modules/subjects/pages/SubjectDetailPage.tsx
?? docs/109-academic-curriculum-ux.md
```
(Plus 50+ archivos de PROMPTs 102-108 en working tree sin commitear)

---

## 12. CONCLUSIÓN

**PROMPT 109 — EXITOSO.**

El catálogo académico ahora refleja claramente la lógica:

```
NIVEL EDUCATIVO
    ↓
ÁREA CURRICULAR
    ↓
ASIGNATURA
    ↓
DOCENTE
    ↓
CURSO
    ↓
PERIODO ACADÉMICO
    ↓
ESTUDIANTES
```

La interfaz guía al administrador mediante:
- **Agrupación visual** en el formulario (fieldsets con leyendas)
- **Ayudas contextuales** ("Define el rango educativo...")
- **Estados vacíos útiles** con enlaces a la acción correcta
- **Información relacional** en listados y detalle
- **Navegación coherente** entre módulos

Sin crear entidades nuevas, sin duplicar datos, sin romper RBAC/tenant isolation/auditoría.

**Próximo paso recomendado:** Commitear working tree completo (PROMPTs 102-109).