// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck, BookOpen, Users } from 'lucide-react';

const ROLES = [
  { key: 'admin',   label: 'Admin',   icon: ShieldCheck, color: '#1d4ed8' },
  { key: 'faculty', label: 'Faculty', icon: BookOpen,    color: '#0284c7' },
  { key: 'student', label: 'Student', icon: Users,       color: '#0ea5e9' },
];

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [form, setForm]   = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.email, form.password);

      // Verify the logged-in role matches what was selected
      const actualRole = user.role;
      const expectedRole = selectedRole === 'faculty' ? 'teacher' : selectedRole;

      if (actualRole !== expectedRole) {
        toast.error(`This account is registered as "${actualRole}", not "${selectedRole}".`);
        return;
      }

      toast.success(`Welcome, ${user.name}!`);
      if (actualRole === 'admin')        navigate('/admin');
      else if (actualRole === 'teacher') navigate('/teacher');
      else if (actualRole === 'student') navigate('/student');
      else                               navigate('/student'); // parent role
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      setError(msg);
    }
  };

  const activeRole = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="login-page">
      <div className="login-card fade-in">

        {/* Logo */}
        <div className="login-logo">
          <div className="icon-wrap" style={{ background: `linear-gradient(135deg, ${activeRole.color}, #0ea5e9)` }}>
            <GraduationCap size={30} color="#fff" />
          </div>
          <h2>EduTrack</h2>
          <p>Attendance &amp; Fee Management System</p>
        </div>

        {/* Role Selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, textAlign: 'center' }}>
            Sign in as
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {ROLES.map(({ key, label, icon: Icon, color }) => {
              const active = selectedRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedRole(key)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: active ? `2px solid ${color}` : '2px solid #e2e8f0',
                    background: active ? `${color}12` : '#f8faff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.18s ease',
                    color: active ? color : '#94a3b8',
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="search-box" style={{ minWidth: 'unset', padding: '10px 14px' }}>
              <Mail size={15} color="#94a3b8" />
              <input
                id="login-email"
                type="email"
                placeholder={`${selectedRole}@school.edu`}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="search-box" style={{ minWidth: 'unset', padding: '10px 14px' }}>
              <Lock size={15} color="#94a3b8" />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading
              ? <span className="spinner" style={{ borderTopColor: '#fff' }} />
              : <>Sign In as {activeRole.label}</>}
          </button>
        </form>

        {/* Contact admin note */}
        <div style={{
          marginTop: 20,
          padding: '12px 16px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 10,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.78rem', color: '#0369a1', lineHeight: 1.6 }}>
            🔐 <strong>New account?</strong><br />
            Contact your administrator to register.<br />
            <span style={{ color: '#0284c7', fontWeight: 600 }}>Self-registration is disabled for security.</span>
          </p>
        </div>

      </div>
    </div>
  );
}
