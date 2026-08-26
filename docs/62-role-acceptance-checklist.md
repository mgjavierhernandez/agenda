# PROMPT 62 — Role Acceptance Checklist

## Instructions

Test each role by opening Chrome and navigating to `http://localhost/login`.

Use DevTools (F12) → Network tab to verify requests go through nginx (`/api/v1/...`).

---

## A. ADMINISTRATOR

**Credentials:** `admin@demo-school.dev` / `Demo1234!`

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Open http://localhost/login | Login page loads | |
| 2 | Login with admin credentials | Redirect to /dashboard | |
| 3 | Check sidebar | All menu items visible | |
| 4 | Open Dashboard | Stats cards, recent data | |
| 5 | Open Students | List of students | |
| 6 | Create a student | Form works, student created | |
| 7 | Edit a student | Form works, changes saved | |
| 8 | Open Courses | List of courses | |
| 9 | Create a course | Form works | |
| 10 | Open Subjects | List of subjects | |
| 11 | Open Grades | List of grades | |
| 12 | Open Tasks | List of tasks | |
| 13 | Create a task | Form works | |
| 14 | Open Communications | List of communications | |
| 15 | Create a communication | Form works | |
| 16 | Open Signatures | List of signature requests | |
| 17 | Open Notifications | List of notifications | |
| 18 | Open Users | List of users | |
| 19 | Open Agenda | Calendar view loads | |
| 20 | Switch agenda views | Day/Week/Month works | |
| 21 | Open Academic Periods | List loads | |
| 22 | Open School Grades | List loads | |
| 23 | Open Enrollments | List loads | |
| 24 | Open Teacher Assignments | List loads | |
| 25 | Open Guardians | List loads | |
| 26 | Logout | Redirect to /login | |

---

## B. DOCENTE (Teacher)

**Credentials:** `teacher@demo-school.dev` / `Demo1234!`

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login | Redirect to /dashboard | |
| 2 | Check sidebar | All items visible (frontend limitation) | |
| 3 | Open Dashboard | Stats load | |
| 4 | Open Students | List loads (read-only) | |
| 5 | Open Courses | List loads | |
| 6 | Open Subjects | List loads | |
| 7 | Open Grades | List loads, can manage | |
| 8 | Open Tasks | List loads | |
| 9 | Create a task | Should work (tasks:create) | |
| 10 | Open Communications | List loads | |
| 11 | Create a communication | Should work | |
| 12 | Open Signatures | List loads (read-only) | |
| 13 | Open Notifications | List loads | |
| 14 | Open Agenda | Calendar loads | |
| 15 | Try to open Users | Should get 403 from API | |
| 16 | Try to open Guardians | Should get 403 from API | |
| 17 | Try to open Enrollments | Should get 403 from API | |
| 18 | Logout | Redirect to /login | |

---

## C. ESTUDIANTE (Student)

**Credentials:** `student@demo-school.dev` / `Demo1234!`

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login | Redirect to /dashboard | |
| 2 | Open Dashboard | Stats load | |
| 3 | Open Tasks | List loads | |
| 4 | Try to create task | Should get 403 from API | |
| 5 | Open Grades | List loads (own grades) | |
| 6 | Open Schedules | List loads | |
| 7 | Open Communications | List loads (read-only) | |
| 8 | Open Notifications | List loads | |
| 9 | Open School Grades | List loads | |
| 10 | Open Academic Periods | List loads | |
| 11 | Open Agenda | Calendar loads | |
| 12 | Try to open Students list | Should get 403 from API | |
| 13 | Try to open Courses | Should get 403 from API | |
| 14 | Try to open Users | Should get 403 from API | |
| 15 | Try to open Guardians | Should get 403 from API | |
| 16 | Logout | Redirect to /login | |

---

## D. ACUDIENTE (Parent/Guardian)

**Credentials:** `parent@demo-school.dev` / `Demo1234!`

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login | Redirect to /dashboard | |
| 2 | Open Dashboard | Stats load | |
| 3 | Open Students | List loads (linked students) | |
| 4 | Open Grades | List loads | |
| 5 | Open Schedules | List loads | |
| 6 | Open Tasks | List loads | |
| 7 | Open Communications | List loads | |
| 8 | Create a communication | Should work | |
| 9 | Open Signatures | List loads | |
| 10 | Sign a signature | Should work if pending | |
| 11 | Open Notifications | List loads | |
| 12 | Open Guardians | List loads | |
| 13 | Open Enrollments | List loads | |
| 14 | Open Agenda | Calendar loads | |
| 15 | Try to open Users | Should get 403 from API | |
| 16 | Try to open Courses | Should get 403 from API | |
| 17 | Try to create task | Should get 403 from API | |
| 18 | Logout | Redirect to /login | |

---

## Notes

- **Frontend limitation:** The sidebar shows ALL menu items to ALL roles because the frontend permission system doesn't fetch permission codes from the backend. This is a known issue documented in the audit.
- **Backend enforcement:** Even though the sidebar shows items, the backend `PermissionGuard` blocks unauthorized API calls (returns 403).
- **Expected behavior:** When a student clicks "Students" in the sidebar, the page may load but the API call will fail with 403. The student will see an error or empty state.
