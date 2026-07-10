// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage         from './pages/LoginPage';
import AdminDashboard    from './pages/AdminDashboard';
import TeacherDashboard  from './pages/TeacherDashboard';
import StudentsPage      from './pages/StudentsPage';
import UsersPage         from './pages/UsersPage';
import TeacherRollCall   from './pages/TeacherRollCall';
import AttendancePage    from './pages/AttendancePage';
import FeesPage          from './pages/FeesPage';
import AlertsPage        from './pages/AlertsPage';
import StudentPortal    from './pages/StudentPortal';
import AcademicSetupPage from './pages/AcademicSetupPage';
import SubjectsPage      from './pages/SubjectsPage';
import LeavesPage        from './pages/LeavesPage';
import CalendarPage      from './pages/CalendarPage';
import ReportsPage       from './pages/ReportsPage';

// Protected layout with sidebar
function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

// Role guard
function Require({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  const defaultPath =
    user?.role === 'admin'   ? '/admin'   :
    user?.role === 'teacher' ? '/teacher' :
    user?.role === 'student' ? '/student' :
    user?.role === 'parent'  ? '/student' : '/login';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultPath} replace /> : <LoginPage />} />

      <Route element={<AppLayout />}>
        {/* ── Admin routes ── */}
        <Route path="/admin"                element={<Require roles={['admin']}><AdminDashboard /></Require>} />
        <Route path="/admin/users"          element={<Require roles={['admin']}><UsersPage /></Require>} />
        <Route path="/admin/students"       element={<Require roles={['admin']}><StudentsPage /></Require>} />
        <Route path="/admin/attendance"     element={<Require roles={['admin']}><AttendancePage /></Require>} />
        <Route path="/admin/mark"           element={<Require roles={['admin']}><TeacherRollCall /></Require>} />
        <Route path="/admin/fees"           element={<Require roles={['admin']}><FeesPage /></Require>} />
        <Route path="/admin/alerts"         element={<Require roles={['admin']}><AlertsPage /></Require>} />
        <Route path="/admin/academic-setup" element={<Require roles={['admin']}><AcademicSetupPage /></Require>} />
        <Route path="/admin/subjects"       element={<Require roles={['admin','teacher']}><SubjectsPage /></Require>} />
        <Route path="/admin/leaves"         element={<Require roles={['admin','teacher']}><LeavesPage /></Require>} />
        <Route path="/admin/calendar"       element={<Require roles={['admin']}><CalendarPage /></Require>} />
        <Route path="/admin/reports"        element={<Require roles={['admin','teacher']}><ReportsPage /></Require>} />

        {/* ── Teacher routes ── */}
        <Route path="/teacher"          element={<Require roles={['admin','teacher']}><TeacherDashboard /></Require>} />
        <Route path="/teacher/mark"     element={<Require roles={['admin','teacher']}><TeacherRollCall /></Require>} />
        <Route path="/teacher/reports"  element={<Require roles={['admin','teacher']}><AttendancePage /></Require>} />
        <Route path="/teacher/subjects" element={<Require roles={['admin','teacher']}><SubjectsPage /></Require>} />
        <Route path="/teacher/leaves"   element={<Require roles={['admin','teacher']}><LeavesPage /></Require>} />

        {/* ── Student / Parent routes ── */}
        <Route path="/student"          element={<Require roles={['parent','student','admin']}><StudentPortal /></Require>} />
        <Route path="/student/alerts"   element={<Require roles={['parent','student','admin']}><AlertsPage /></Require>} />
        <Route path="/student/leaves"   element={<Require roles={['parent','student','admin']}><LeavesPage /></Require>} />
        {/* legacy /parent redirect support */}
        <Route path="/parent"           element={<Require roles={['parent','student','admin']}><StudentPortal /></Require>} />
        <Route path="/parent/alerts"    element={<Require roles={['parent','student','admin']}><AlertsPage /></Require>} />
        <Route path="/parent/leaves"    element={<Require roles={['parent','student','admin']}><LeavesPage /></Require>} />
      </Route>

      {/* Default & 404 */}
      <Route path="/"  element={<Navigate to={defaultPath} replace />} />
      <Route path="*"  element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #dbe8fd',
              borderRadius: '10px',
              fontSize: '0.85rem',
              boxShadow: '0 4px 20px rgba(30,58,138,0.12)',
            },
            success: { iconTheme: { primary: '#1d4ed8', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
