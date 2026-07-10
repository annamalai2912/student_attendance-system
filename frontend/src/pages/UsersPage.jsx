// frontend/src/pages/UsersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit, UserX, UserCheck, KeyRound, X, Check,
  ShieldCheck, BookOpen, Users, Eye, EyeOff, Trash2
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',   label: 'Admin',   icon: ShieldCheck, badgeClass: 'badge-purple' },
  { value: 'teacher', label: 'Faculty', icon: BookOpen,    badgeClass: 'badge-blue' },
  { value: 'student', label: 'Student', icon: Users,       badgeClass: 'badge-green' },
];
const EMPTY_FORM = { name: '', email: '', password: '', role: 'student', assignedClass: '', studentRef: '' };

// ── Sub-components ────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role) || { label: role, badgeClass: 'badge-yellow', icon: Users };
  const Icon = r.icon;
  return (
    <span className={`badge ${r.badgeClass}`}>
      <Icon size={10} /> {r.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${colorClass}`}><Icon size={20} /></div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]         = useState([]);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading]     = useState(true);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal]     = useState(null); // user object
  const [pwModal, setPwModal]         = useState(null); // user object

  const [students, setStudents]   = useState([]);
  // Forms
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({});
  const [newPw, setNewPw]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search)     params.search = search;
      const { data } = await api.get('/users', { params });
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [roleFilter, search]);

  useEffect(() => {
    load();
    api.get('/students').then(r => setStudents(r.data)).catch(() => {});
  }, [load]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (form.role !== 'student') delete payload.studentRef;
      const { data } = await api.post('/users', payload);
      const newUser = data.user;

      // If student role, link the Student record's userRef to the new user
      if (form.role === 'student' && form.studentRef && newUser?._id) {
        await api.put(`/students/${form.studentRef}`, { userRef: newUser._id }).catch(err =>
          console.warn('Could not set userRef on student:', err.message)
        );
      }

      toast.success(
        `✅ ${form.role === 'student' ? 'Student' : form.role} account created!\nEmail: ${form.email}\nPassword: ${form.password}`,
        { duration: 8000 }
      );
      setCreateModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating user'); }
    setSaving(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/users/${editModal._id}`, editForm);
      toast.success('User updated');
      setEditModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error updating'); }
    setSaving(false);
  };

  const handleResetPw = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/users/${pwModal._id}/reset-password`, { newPassword: newPw });
      toast.success(`Password reset for ${pwModal.name}`);
      setPwModal(null);
      setNewPw('');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const toggleActive = async (u) => {
    const action = u.isActive ? 'Deactivate' : 'Reactivate';
    if (!confirm(`${action} account for ${u.name}?`)) return;
    try {
      if (u.isActive) {
        await api.delete(`/users/${u._id}`);
        toast.success(`${u.name} deactivated`);
      } else {
        await api.put(`/users/${u._id}`, { isActive: true });
        toast.success(`${u.name} reactivated`);
      }
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteUser = async (u) => {
    const confirmed = confirm(
      `⚠️ PERMANENTLY DELETE "${u.name}"?\n\nThis cannot be undone. All login access will be removed.\n\nClick OK to confirm.`
    );
    if (!confirmed) return;
    try {
      await api.delete(`/users/${u._id}/permanent`);
      toast.success(`${u.name} permanently deleted`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  // ── Counts ──────────────────────────────────────────────────────────────────
  const adminCount   = users.filter(u => u.role === 'admin').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const studentCount = users.filter(u => u.role === 'student').length;
  const activeCount  = users.filter(u => u.isActive).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">User Management</h2>
          <p className="page-subtitle">Create and manage admin, faculty &amp; parent accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setCreateModal(true); }}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Admins"        value={adminCount}   icon={ShieldCheck} colorClass="purple" />
        <StatCard label="Faculty"        value={teacherCount} icon={BookOpen}    colorClass="blue" />
        <StatCard label="Students"       value={studentCount} icon={Users}       colorClass="green" />
        <StatCard label="Active Users"   value={activeCount}  icon={UserCheck}   colorClass="green" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={15} color="#94a3b8" />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[{ value: '', label: 'All' }, ...ROLES.map(r => ({ value: r.value, label: r.label }))].map(opt => (
            <button
              key={opt.value}
              className={`tab-btn${roleFilter === opt.value ? ' active' : ''}`}
              onClick={() => setRoleFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Class / Info</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>
                  <div className="spinner" style={{ margin: 'auto', width: 28, height: 28, borderTopColor: 'var(--primary)' }} />
                </td></tr>
              )}
              {!loading && users.map(u => (
                <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: u.role === 'admin' ? '#eff6ff' : u.role === 'teacher' ? '#e0f2fe' : '#ecfdf5',
                        border: `2px solid ${u.role === 'admin' ? '#bfdbfe' : u.role === 'teacher' ? '#7dd3fc' : '#6ee7b7'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.78rem',
                        color: u.role === 'admin' ? '#1d4ed8' : u.role === 'teacher' ? '#0284c7' : '#059669',
                        flexShrink: 0,
                      }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    {u.role === 'teacher' && u.assignedClass
                      ? <span className="badge badge-blue">📚 {u.assignedClass}</span>
                      : u.role === 'student' && u.studentRef
                      ? <span className="badge badge-green">🎓 {typeof u.studentRef === 'object' ? u.studentRef.regNo : 'Linked'}</span>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td>
                    {u.isActive
                      ? <span className="badge badge-green"><span className="dot dot-green" /> Active</span>
                      : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {format(new Date(u.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Edit */}
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit user"
                        onClick={() => { setEditModal(u); setEditForm({ name: u.name, email: u.email, role: u.role, assignedClass: u.assignedClass || '', studentRef: u.studentRef?._id || u.studentRef || '' }); }}
                      >
                        <Edit size={13} />
                      </button>
                      {/* Reset Password */}
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Reset password"
                        style={{ color: 'var(--warning)' }}
                        onClick={() => { setPwModal(u); setNewPw(''); setShowPw(false); }}
                      >
                        <KeyRound size={13} />
                      </button>
                      {/* Toggle Active (deactivate / reactivate) */}
                      <button
                        className={`btn btn-sm btn-icon ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                        title={u.isActive ? 'Deactivate' : 'Reactivate'}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      {/* Permanent Delete */}
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Permanently delete user"
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        onClick={() => deleteUser(u)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state"><h3>No users found</h3><p>Click "Add User" to create the first account</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      {createModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCreateModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">➕ Create New User</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCreateModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleCreate}>
              {/* Role pills */}
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {ROLES.map(({ value, label, icon: Icon }) => {
                    const active = form.role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: value }))}
                        style={{
                          padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                          border: active ? '2px solid var(--primary)' : '2px solid var(--border)',
                          background: active ? 'var(--primary-pale)' : 'var(--bg-input)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                          color: active ? 'var(--primary)' : 'var(--text-dim)',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Icon size={17} />
                        <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password * (min 6 characters)</label>
                <div className="search-box" style={{ minWidth: 'unset', padding: '9px 13px' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Set a temporary password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit', flex: 1 }}
                    required minLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {form.role === 'teacher' && (
                <div className="form-group">
                  <label className="form-label">Assigned Class</label>
                  <input className="form-input" placeholder="e.g. ECE-B, CSE-A"
                    value={form.assignedClass}
                    onChange={e => setForm(f => ({ ...f, assignedClass: e.target.value }))} />
                </div>
              )}
              {form.role === 'student' && (
                <div className="form-group">
                  <label className="form-label">Link to Student Record</label>
                  <select className="form-select" value={form.studentRef}
                    onChange={e => setForm(f => ({ ...f, studentRef: e.target.value, name: f.name || students.find(s => s._id === e.target.value)?.name || '' }))}>
                    <option value="">-- Select student record --</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.regNo}) · {s.class}</option>)}
                  </select>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>This links the login account to the student's attendance & fee data</p>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Create Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────────── */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit — {editModal.name}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditModal(null)}><X size={14} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {editForm.role === 'teacher' && (
                <div className="form-group">
                  <label className="form-label">Assigned Class</label>
                  <input className="form-input" placeholder="e.g. ECE-B"
                    value={editForm.assignedClass}
                    onChange={e => setEditForm(f => ({ ...f, assignedClass: e.target.value }))} />
                </div>
              )}
              {editForm.role === 'student' && (
                <div className="form-group">
                  <label className="form-label">Link Student Record</label>
                  <select className="form-select" value={editForm.studentRef || ''}
                    onChange={e => setEditForm(f => ({ ...f, studentRef: e.target.value }))}>
                    <option value="">-- Not linked --</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.regNo}) · {s.class}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────────────── */}
      {pwModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPwModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">🔑 Reset Password</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPwModal(null)}><X size={14} /></button>
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem' }}>
              Resetting password for <strong>{pwModal.name}</strong><br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{pwModal.email} · <RoleBadge role={pwModal.role} /></span>
            </div>
            <form onSubmit={handleResetPw}>
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <div className="search-box" style={{ minWidth: 'unset', padding: '9px 13px' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit', flex: 1 }}
                    required minLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPwModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || newPw.length < 6}>
                  {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : '🔑 Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
