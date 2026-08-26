# Agenda Escolar Digital v1.0.1 — Checklist de Aceptacion Local

**Para:** Product Owner (Javier)
**Fecha:** 2026-08-25
**URL:** http://localhost:80

---

## Como usar este checklist

1. Abrir http://localhost:80 en Chrome o Edge
2. Seguir cada paso
3. Marcar con una X: [X] PASS, [ ] FAIL, [ ] BLOCKED
4. Si algo falla, anotar en Observaciones

---

## CREDENCIALES DE PRUEBA

| Campo | Valor |
|-------|-------|
| Email | `admin@demo-school.dev` |
| Contrasena | `Demo1234!` |
| Institucion | Demo School |

---

## 1. AUTENTICACION

### 1.1 Login

| ID | Paso | Resultado |
|----|------|-----------|
| 1.1.1 | Abrir http://localhost:80 | Debe redirigir a /login |
| 1.1.2 | Verificar que aparece "Iniciar sesion" | Titulo visible |
| 1.1.3 | Verificar campo "Correo electronico" | Input visible |
| 1.1.4 | Verificar campo "Contrasena" | Input visible |
| 1.1.5 | Verificar boton "Entrar" | Boton visible |
| 1.1.6 | Ingresar email: admin@demo-school.dev | Texto se muestra |
| 1.1.7 | Ingresar contrasena: Demo1234! | Texto se muestra como puntos |
| 1.1.8 | Hacer clic en "Entrar" | Debe redirigir a /dashboard |
| 1.1.9 | Verificar que aparece "Bienvenido" | Titulo del dashboard |
| 1.1.10 | Verificar menu lateral | 19 items de navegacion |

### 1.2 Credenciales Incorrectas

| ID | Paso | Resultado |
|----|------|-----------|
| 1.2.1 | Cerrar sesion | Debe volver a /login |
| 1.2.2 | Ingresar email correcto, contrasena incorrecta | Debe mostrar error |
| 1.2.3 | Verificar mensaje de error | Aparece alerta roja |

### 1.3 Sesion

| ID | Paso | Resultado |
|----|------|-----------|
| 1.3.1 | Login exitoso | Permanece en /dashboard |
| 1.3.2 | Refrescar pagina (F5) | Debe mantener sesion |
| 1.3.3 | Verificar que el dashboard carga | Datos visibles |

### 1.4 Logout

| ID | Paso | Resultado |
|----|------|-----------|
| 1.4.1 | Hacer clic en icono de usuario (arriba derecha) | Menu desplegable |
| 1.4.2 | Hacer clic en "Cerrar sesion" | Redirige a /login |
| 1.4.3 | Intentar acceder a /dashboard directamente | Debe redirigir a /login |

---

## 2. DASHBOARD

| ID | Paso | Resultado |
|----|------|-----------|
| 2.1 | Ir a /dashboard | Pagina carga |
| 2.2 | Verificar tarjetas estadisticas | Estudiantes, cursos, tareas, etc. |
| 2.3 | Verificar tareas recientes | Lista aparece |
| 2.4 | Verificar notificaciones recientes | Lista aparece |
| 2.5 | Verificar firmas pendientes | Seccion visible |
| 2.6 | Verificar accesos rapidos | Links funcionales |
| 2.7 | Probar en ventana reducida (mobile) | Layout responsive |

---

## 3. ESTUDIANTES

| ID | Paso | Resultado |
|----|------|-----------|
| 3.1 | Ir a /students | Listado carga |
| 3.2 | Verificar que muestra 3 estudiantes | Datos del seed |
| 3.3 | Usar barra de busqueda | Filtra resultados |
| 3.4 | Hacer clic en "Nuevo Estudiante" | Formulario aparece |
| 3.5 | Llenar nombre, email, campos requeridos | Formulario acepta datos |
| 3.6 | Guardar | Estudiante creado |
| 3.7 | Hacer clic en un estudiante | Detalle carga |
| 3.8 | Editar nombre | Cambios se guardan |
| 3.9 | Verificar estado (ACTIVE/INACTIVE) | Badge visible |
| 3.10 | Probar paginacion | Si hay muchos registros |

---

## 4. CURSOS

| ID | Paso | Resultado |
|----|------|-----------|
| 4.1 | Ir a /courses | Listado carga |
| 4.2 | Verificar cursos del seed | 3 cursos |
| 4.3 | Crear nuevo curso | Formulario funciona |
| 4.4 | Ver detalle de curso | Informacion completa |
| 4.5 | Editar curso | Cambios se guardan |
| 4.6 | Verificar estado | Badge visible |

---

## 5. ASIGNATURAS

| ID | Paso | Resultado |
|----|------|-----------|
| 5.1 | Ir a /subjects | Listado carga |
| 5.2 | Crear nueva asignatura | Formulario funciona |
| 5.3 | Editar asignatura | Cambios se guardan |
| 5.4 | Verificar estado | Badge visible |

---

## 6. NOTAS

| ID | Paso | Resultado |
|----|------|-----------|
| 6.1 | Ir a /grades | Listado carga |
| 6.2 | Verificar notas del seed | 16 notas |
| 6.3 | Crear nueva nota | Formulario funciona |
| 6.4 | Editar nota | Cambios se guardan |
| 6.5 | Verificar estudiante y asignatura asociados | Relaciones correctas |

---

## 7. GRADOS ACADEMICOS

| ID | Paso | Resultado |
|----|------|-----------|
| 7.1 | Ir a /school-grades | Listado carga |
| 7.2 | Verificar 6 grados del seed | Datos correctos |
| 7.3 | Crear nuevo grado | Formulario funciona |
| 7.4 | Editar grado | Cambios se guardan |
| 7.5 | Verificar codigo unico | No permite duplicados |

---

## 8. PERIODOS ACADEMICOS

| ID | Paso | Resultado |
|----|------|-----------|
| 8.1 | Ir a /academic-periods | Listado carga |
| 8.2 | Verificar 2 periodos del seed | Datos correctos |
| 8.3 | Crear nuevo periodo | Formulario funciona |
| 8.4 | Verificar fechas inicio/fin | Campos de fecha |
| 8.5 | Editar periodo | Cambios se guardan |

---

## 9. MATRICULAS

| ID | Paso | Resultado |
|----|------|-----------|
| 9.1 | Ir a /enrollments | Listado carga |
| 9.2 | Verificar 2 matriculas del seed | Datos correctos |
| 9.3 | Crear nueva matricula | Seleccionar estudiante y curso |
| 9.4 | Verificar resolucion de nombres | Muestra nombre del estudiante |
| 9.5 | Verificar estado | ACTIVE/INACTIVE |

---

## 10. ASIGNACIONES DOCENTES

| ID | Paso | Resultado |
|----|------|-----------|
| 10.1 | Ir a /teacher-assignments | Listado carga |
| 10.2 | Verificar 2 asignaciones del seed | Datos correctos |
| 10.3 | Crear nueva asignacion | Seleccionar profesor, curso, asignatura |
| 10.4 | Verificar relaciones | Muestra datos correctos |

---

## 11. HORARIOS

| ID | Paso | Resultado |
|----|------|-----------|
| 11.1 | Ir a /schedules | Listado carga |
| 11.2 | Verificar 6 horarios del seed | Datos correctos |
| 11.3 | Crear nuevo horario | Formulario funciona |
| 11.4 | Verificar dias y horas | Campos funcionales |

---

## 12. TAREAS

| ID | Paso | Resultado |
|----|------|-----------|
| 12.1 | Ir a /tasks | Listado carga |
| 12.2 | Verificar 4 tareas del seed | Datos correctos |
| 12.3 | Crear nueva tarea | Titulo, descripcion, fecha |
| 12.4 | Editar tarea | Cambios se guardan |
| 12.5 | Publicar tarea | Cambia de DRAFT a PUBLISHED |
| 12.6 | Verificar estado | Badge visible |

---

## 13. ASIGNACIONES DE TAREAS

| ID | Paso | Resultado |
|----|------|-----------|
| 13.1 | Ir a /task-assignments | Listado carga |
| 13.2 | Asignar tarea a estudiante | Formulario funciona |
| 13.3 | Verificar asignacion | Aparece en listado |

---

## 14. ENTREGAS

| ID | Paso | Resultado |
|----|------|-----------|
| 14.1 | Ir a /task-submissions | Listado carga |
| 14.2 | Verificar entregas existentes | Datos del seed |
| 14.3 | Ver detalle de entrega | Informacion completa |

---

## 15. COMUNICACIONES

| ID | Paso | Resultado |
|----|------|-----------|
| 15.1 | Ir a /communications | Listado carga |
| 15.2 | Verificar 4 comunicaciones del seed | Datos correctos |
| 15.3 | Crear nueva comunicacion | Titulo, contenido |
| 15.4 | Agregar destinatarios | Seleccionar usuarios |
| 15.5 | Publicar comunicacion | Cambia estado |
| 15.6 | Ir a /communication-inbox | Bandeja de entrada |
| 15.7 | Verificar recipients | Aparecen en inbox |

---

## 16. FIRMAS

| ID | Paso | Resultado |
|----|------|-----------|
| 16.1 | Ir a /signatures | Listado carga |
| 16.2 | Verificar 2 solicitudes del seed | Datos correctos |
| 16.3 | Crear nueva solicitud | Titulo, firmantes |
| 16.4 | Agregar multiples firmantes | Formulario funciona |
| 16.5 | Firmar solicitud | Cambia estado |
| 16.6 | Rechazar solicitud | Cambia estado |

---

## 17. NOTIFICACIONES

| ID | Paso | Resultado |
|----|------|-----------|
| 17.1 | Ir a /notifications | Listado carga |
| 17.2 | Verificar notificaciones del seed | Datos correctos |
| 17.3 | Marcar como leida | Cambia estado |
| 17.4 | Verificar badge en topbar | Contador actualizado |

---

## 18. ACUDIENTES

| ID | Paso | Resultado |
|----|------|-----------|
| 18.1 | Ir a /guardians | Listado carga |
| 18.2 | Vincular acudiente a estudiante | Formulario funciona |
| 18.3 | Verificar relacion | Aparece en listado |

---

## 19. AGENDA DIGITAL

### 19.1 Vista Dia

| ID | Paso | Resultado |
|----|------|-----------|
| 19.1.1 | Ir a /agenda | Agenda carga |
| 19.1.2 | Verificar vista de dia | Eventos del dia |
| 19.1.3 | Navegar a otro dia | Fecha cambia |
| 19.1.4 | Verificar eventos de schedules | Horarios aparecen |
| 19.1.5 | Verificar eventos de tasks | Tareas aparecen |

### 19.2 Vista Semana

| ID | Paso | Resultado |
|----|------|-----------|
| 19.2.1 | Cambiar a vista semana | 7 columnas |
| 19.2.2 | Navegar semana anterior/proxima | Fechas cambian |
| 19.2.3 | Verificar eventos en multiples dias | Datos correctos |

### 19.3 Vista Mes

| ID | Paso | Resultado |
|----|------|-----------|
| 19.3.1 | Cambiar a vista mes | Calendario completo |
| 19.3.2 | Navegar mes anterior/proximo | Mes cambia |
| 19.3.3 | Verificar eventos del mes | 31 eventos (agosto) |

---

## 20. ARCHIVOS

| ID | Paso | Resultado |
|----|------|-----------|
| 20.1 | Subir archivo en tarea | Upload funciona |
| 20.2 | Ver archivo adjunto | Aparece en tarea |
| 20.3 | Descargar archivo | Descarga inicia |
| 20.4 | Intentar subir archivo muy grande (>10MB) | Error mostrado |
| 20.5 | Intentar subir MIME invalido | Error mostrado |

---

## 21. RESPONSIVE

| ID | Paso | Resultado |
|----|------|-----------|
| 21.1 | Desktop (1920x1080) | Layout correcto |
| 21.2 | Tablet (768x1024) | Layout se adapta |
| 21.3 | Mobile (375x667) | Menu colapsa, contenido accesible |
| 21.4 | Sidebar en mobile | Boton hamburguesa |
| 21.5 | Tablas en mobile | Scroll horizontal o cards |
| 21.6 | Formularios en mobile | Inputs utilizables |

---

## 22. RBAC (CONTROL DE ACCESO)

| ID | Paso | Resultado |
|----|------|-----------|
| 22.1 | Login como admin | Todos los menus visibles |
| 22.2 | Verificar que items del sidebar se filtran | Segun permisos |
| 22.3 | Intentar acceder a URL protegida sin permiso | 403 |

---

## RESUMEN

| Categoria | Total | PASS | FAIL | BLOCKED |
|-----------|-------|------|------|---------|
| Autenticacion | 16 | | | |
| Dashboard | 7 | | | |
| Estudiantes | 10 | | | |
| Cursos | 6 | | | |
| Asignaturas | 5 | | | |
| Notas | 5 | | | |
| Grados | 5 | | | |
| Periodos | 5 | | | |
| Matriculas | 5 | | | |
| Asig. Docentes | 4 | | | |
| Horarios | 4 | | | |
| Tareas | 6 | | | |
| Asig. Tareas | 3 | | | |
| Entregas | 3 | | | |
| Comunicaciones | 7 | | | |
| Firmas | 6 | | | |
| Notificaciones | 4 | | | |
| Acudientes | 3 | | | |
| Agenda | 11 | | | |
| Archivos | 5 | | | |
| Responsive | 6 | | | |
| RBAC | 3 | | | |
| **TOTAL** | **129** | | | |
