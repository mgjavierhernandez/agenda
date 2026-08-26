# PROMPT 63 — User Acceptance Checklist

## ADMIN (admin@demo-school.dev)

| # | Module | Action | Expected | Result |
|---|--------|--------|----------|--------|
| 1 | Login | Login with admin credentials | Redirect to dashboard | PASS |
| 2 | Dashboard | View dashboard | Stats, navigation | PASS |
| 3 | Students | List students | 3 students visible | PASS |
| 4 | Students | Create student | Form works | PASS |
| 5 | Courses | List courses | Course list | PASS |
| 6 | Subjects | List subjects | Subject list | PASS |
| 7 | Grades | List grades | Grade list | PASS |
| 8 | Tasks | List tasks | Task list | PASS |
| 9 | Tasks | Create task | Form works | PASS |
| 10 | Communications | List comms | Communication list | PASS |
| 11 | Users | List users | User list | PASS |
| 12 | Enrollments | List enrollments | Enrollment list | PASS |
| 13 | Guardians | List guardians | Guardian list | PASS |
| 14 | Signatures | List signatures | Signature list | PASS |
| 15 | Notifications | List notifications | Notification list | PASS |
| 16 | Agenda | View agenda | Calendar with events | PASS |
| 17 | My-permissions | Check permissions | 52 permissions | PASS |
| 18 | Logout | Logout | Redirect to login | PASS |

## TEACHER (teacher@demo-school.dev)

| # | Module | Action | Expected | Result |
|---|--------|--------|----------|--------|
| 1 | Login | Login with teacher credentials | Redirect to dashboard | PASS |
| 2 | Dashboard | View dashboard | Stats, navigation | PASS |
| 3 | Students | List students | Student list (read-only) | PASS |
| 4 | Courses | List courses | Course list | PASS |
| 5 | Subjects | List subjects | Subject list | PASS |
| 6 | Grades | List grades | Grade list | PASS |
| 7 | Tasks | List tasks | Task list | PASS |
| 8 | Tasks | Create task | Form works | PASS |
| 9 | Communications | List comms | Communication list | PASS |
| 10 | Users | Attempt access | 403 Forbidden | PASS |
| 11 | Enrollments | Attempt access | 403 Forbidden | PASS |
| 12 | Guardians | Attempt access | 403 Forbidden | PASS |
| 13 | Signatures | List signatures | Signature list | PASS |
| 14 | Notifications | List notifications | Notification list | PASS |
| 15 | Agenda | View agenda | Calendar with events | PASS |
| 16 | My-permissions | Check permissions | 24 permissions | PASS |
| 17 | Logout | Logout | Redirect to login | PASS |

## STUDENT (student@demo-school.dev)

| # | Module | Action | Expected | Result |
|---|--------|--------|----------|--------|
| 1 | Login | Login with student credentials | Redirect to dashboard | PASS |
| 2 | Dashboard | View dashboard | Student-relevant info | PASS |
| 3 | Grades | List grades | Own grades | PASS |
| 4 | Tasks | List tasks | Assigned tasks | PASS |
| 5 | Communications | List comms | Communications | PASS |
| 6 | Users | Attempt access | 403 Forbidden | PASS |
| 7 | Courses | Attempt access | 403 Forbidden | PASS |
| 8 | Subjects | Attempt access | 403 Forbidden | PASS |
| 9 | Enrollments | List enrollments | Enrollment list | PASS |
| 10 | Notifications | List notifications | Notification list | PASS |
| 11 | Agenda | View agenda | Calendar | PASS |
| 12 | My-permissions | Check permissions | 11 permissions | PASS |
| 13 | Logout | Logout | Redirect to login | PASS |

## PARENT (parent@demo-school.dev)

| # | Module | Action | Expected | Result |
|---|--------|--------|----------|--------|
| 1 | Login | Login with parent credentials | Redirect to dashboard | PASS |
| 2 | Dashboard | View dashboard | Parent-relevant info | PASS |
| 3 | Students | List students | 2 linked students only | PASS |
| 4 | Students | Access linked student | 200 OK | PASS |
| 5 | Students | Access unlinked student | 404 Not Found | PASS |
| 6 | Grades | List grades | Grades for linked students | PASS |
| 7 | Tasks | List tasks | Tasks for linked students | PASS |
| 8 | Communications | List comms | Communications | PASS |
| 9 | Users | Attempt access | 403 Forbidden | PASS |
| 10 | Courses | Attempt access | 403 Forbidden | PASS |
| 11 | Subjects | Attempt access | 403 Forbidden | PASS |
| 12 | Signatures | List signatures | Signature requests | PASS |
| 13 | Guardians | List guardians | Guardian-student links | PASS |
| 14 | Notifications | List notifications | Notification list | PASS |
| 15 | Agenda | View agenda | Calendar | PASS |
| 16 | My-permissions | Check permissions | 15 permissions | PASS |
| 17 | Logout | Logout | Redirect to login | PASS |
