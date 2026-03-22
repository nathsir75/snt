// Backward-compat shim — new code should import role-specific topbars directly:
//   AdminTopbarComponent   → layout/admin-topbar
//   TeacherTopbarComponent → layout/teacher-topbar
//   StudentTopbarComponent → layout/student-topbar
export { AdminTopbarComponent as TopbarComponent } from '../admin-topbar/admin-topbar.component';
