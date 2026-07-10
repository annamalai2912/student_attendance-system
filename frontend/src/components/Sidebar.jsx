// frontend/src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardCheck, IndianRupee,
  Bell, LogOut, GraduationCap, BarChart2, PenLine, UserCog,
  Building2, CalendarDays, BookOpen, FileOutput, ClipboardList,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

const ADMIN_NAV = [
  { section: 'Overview' },
  { icon: LayoutDashboard, label: 'Dashboard',          to: '/admin' },

  { section: 'Academic Setup' },
  { icon: Building2,       label: 'Departments & Years',to: '/admin/academic-setup' },
  { icon: CalendarDays,    label: 'Academic Calendar',  to: '/admin/calendar' },
  { icon: BookOpen,        label: 'Subjects',           to: '/admin/subjects' },

  { section: 'Students' },
  { icon: Users,           label: 'Student Records',    to: '/admin/students' },
  { icon: ClipboardList,   label: 'Leave Management',   to: '/admin/leaves' },

  { section: 'Attendance' },
  { icon: PenLine,         label: 'Mark Roll Call',     to: '/admin/mark' },
  { icon: ClipboardCheck,  label: 'Attendance Report',  to: '/admin/attendance' },
  { icon: FileOutput,      label: 'Export Reports',     to: '/admin/reports' },
  { icon: ShieldAlert,     label: 'Barred Students',    to: '/admin/reports' },

  { section: 'Finance & Admin' },
  { icon: IndianRupee,     label: 'Fee Ledger',         to: '/admin/fees' },
  { icon: Bell,            label: 'Alert Logs',         to: '/admin/alerts' },
  { icon: UserCog,         label: 'User Management',    to: '/admin/users' },
];

const TEACHER_NAV = [
  { section: 'Attendance' },
  { icon: LayoutDashboard, label: 'Dashboard',          to: '/teacher' },
  { icon: PenLine,         label: 'Mark Roll Call',     to: '/teacher/mark' },
  { icon: BarChart2,       label: 'Attendance Report',  to: '/teacher/reports' },
  { icon: BookOpen,        label: 'My Subjects',        to: '/teacher/subjects' },
  { icon: ClipboardList,   label: 'Leave Requests',     to: '/teacher/leaves' },
];

const STUDENT_NAV = [
  { section: 'Portal' },
  { icon: LayoutDashboard, label: 'My Dashboard',       to: '/student' },
  { icon: Bell,            label: 'Notifications',      to: '/student/alerts' },
  { icon: ClipboardList,   label: 'Leave Application',  to: '/student/leaves' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav = user?.role === 'admin' ? ADMIN_NAV
    : user?.role === 'teacher' ? TEACHER_NAV
    : STUDENT_NAV;

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const initials  = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleLabel = user?.role === 'admin' ? 'Administrator'
    : user?.role === 'teacher' ? 'Faculty'
    : user?.role === 'student' ? 'Student'
    : 'Parent / Guardian';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
          }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <h1>EduTrack</h1>
            <p>College ERP System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map((item, idx) => {
          if (item.section) {
            return (
              <p key={`s-${idx}`} className="nav-section-title" style={{ marginTop: idx > 0 ? 10 : 0 }}>
                {item.section}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.to === '/admin' || item.to === '/teacher' || item.to === '/parent'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
          onClick={handleLogout}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
