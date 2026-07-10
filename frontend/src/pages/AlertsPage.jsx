// frontend/src/pages/AlertsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Filter, Trash2, X, Users, BookOpen, User } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_MAP = {
  ATTENDANCE_WARNING:  { emoji: '⚠️', label: 'Attendance Warning', badge: 'badge-yellow' },
  FEE_REMINDER:        { emoji: '💰', label: 'Fee Reminder',        badge: 'badge-blue'   },
  ABSENT_TODAY:        { emoji: '📋', label: 'Absent Today',        badge: 'badge-red'    },
  CUSTOM_NOTIFICATION: { emoji: '📢', label: 'Custom Notice',       badge: 'badge-purple' },
};

const EMPTY_FORM = {
  title: '', message: '', sendTo: 'all', classFilter: '', studentIds: [],
  language: 'en', sendEmail: false,
};

// ─── Send Notification Modal ──────────────────────────────────────────────────
function SendModal({ onClose, onSent, students, classes }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [search, setSearch]   = useState('');

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNo?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id) => setForm(f => ({
    ...f,
    studentIds: f.studentIds.includes(id)
      ? f.studentIds.filter(x => x !== id)
      : [...f.studentIds, id],
  }));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message are required');
    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        language: form.language,
        sendEmail: form.sendEmail,
      };
      if (form.sendTo === 'class' && form.classFilter) payload.classFilter = form.classFilter;
      else if (form.sendTo === 'students' && form.studentIds.length > 0) payload.studentIds = form.studentIds;
      // else sendTo === 'all' → no filter → all students

      const { data } = await api.post('/alerts/send', payload);
      toast.success(`✅ ${data.message}`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    }
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3 className="modal-title">📢 Send Notification</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSend}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} required
              placeholder="e.g. Holiday Notice, Fee Reminder…"
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Message */}
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-input" rows={4} value={form.message} required
              placeholder="Write your notification message here…"
              style={{ resize: 'vertical' }}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>

          {/* Audience */}
          <div className="form-group">
            <label className="form-label">Send To</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { value: 'all',      label: '🏫 All Students', icon: Users },
                { value: 'class',    label: '📚 By Class',      icon: BookOpen },
                { value: 'students', label: '👤 Select Students', icon: User },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '8px 14px', border: `2px solid ${form.sendTo === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 8, fontSize: '0.83rem', fontWeight: form.sendTo === opt.value ? 600 : 400,
                  background: form.sendTo === opt.value ? 'var(--primary-light)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="sendTo" value={opt.value} checked={form.sendTo === opt.value}
                    onChange={() => setForm(f => ({ ...f, sendTo: opt.value, classFilter: '', studentIds: [] }))}
                    style={{ display: 'none' }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Class filter */}
          {form.sendTo === 'class' && (
            <div className="form-group">
              <label className="form-label">Class Name</label>
              <input className="form-input" list="cls-list" value={form.classFilter}
                placeholder="e.g. ECE, CSE-A"
                onChange={e => setForm(f => ({ ...f, classFilter: e.target.value }))} />
              <datalist id="cls-list">{classes.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          )}

          {/* Student multi-select */}
          {form.sendTo === 'students' && (
            <div className="form-group">
              <label className="form-label">Select Students ({form.studentIds.length} selected)</label>
              <input className="form-input" value={search} placeholder="Search student…"
                onChange={e => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {filteredStudents.map(s => (
                  <label key={s._id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: form.studentIds.includes(s._id) ? 'var(--primary-light)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={form.studentIds.includes(s._id)}
                      onChange={() => toggleStudent(s._id)} />
                    <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{s.name}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{s.regNo} · {s.class}</span>
                  </label>
                ))}
                {filteredStudents.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.84rem' }}>No students found</div>
                )}
              </div>
            </div>
          )}

          {/* Options row */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Language</label>
              <select className="form-select" value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="en">🇬🇧 English</option>
                <option value="ta">🇮🇳 Tamil</option>
                <option value="te">🇮🇳 Telugu</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', marginTop: 16 }}>
              <input type="checkbox" checked={form.sendEmail}
                onChange={e => setForm(f => ({ ...f, sendEmail: e.target.checked }))} />
              📧 Also send email (if configured)
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Send size={14} /> Send Notification</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  const [alerts, setAlerts]     = useState([]);
  const [filter, setFilter]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents]   = useState([]);
  const [classes, setClasses]     = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.type = filter;
      const { data } = await api.get('/alerts', { params });
      setAlerts(data);
    } catch { toast.error('Failed to load alerts'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Load students+classes for admin modal
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get('/students').catch(() => ({ data: [] })),
      api.get('/students/meta/classes').catch(() => ({ data: [] })),
    ]).then(([s, c]) => { setStudents(s.data); setClasses(c.data); });
  }, [isAdmin]);

  const deleteAlert = async (id) => {
    if (!confirm('Delete this alert record?')) return;
    try {
      await api.delete(`/alerts/${id}`);
      toast.success('Alert removed');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {isAdmin ? 'Notifications' : '🔔 My Notifications'}
          </h2>
          <p className="page-subtitle">{alerts.length} {isAdmin ? 'total notifications sent' : 'notifications for you'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Filter size={13} color="var(--text-dim)" />
            <select className="form-select" style={{ width: 'auto' }} value={filter}
              onChange={e => setFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="ATTENDANCE_WARNING">⚠️ Attendance</option>
              <option value="FEE_REMINDER">💰 Fee</option>
              <option value="ABSENT_TODAY">📋 Absent</option>
              <option value="CUSTOM_NOTIFICATION">📢 Custom</option>
            </select>
          </div>
          {/* Send button — admin/teacher only */}
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Send size={14} /> Send Notification
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: 'auto', width: 36, height: 36 }} />
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="empty-state card">
          <Bell size={40} />
          <h3>No notifications yet</h3>
          <p>{isAdmin ? 'Click "Send Notification" to create one' : 'You have no notifications'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(a => {
          const meta = TYPE_MAP[a.type] || { emoji: '🔔', label: a.type, badge: 'badge-purple' };
          return (
            <div key={a._id} className="alert-item card" style={{ padding: '14px 18px' }}>
              <span className="alert-icon" style={{ fontSize: '1.4rem' }}>{meta.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {a.title || a.studentRef?.name || 'Unknown'}
                  </span>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  {a.studentRef && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      → {a.studentRef.name} ({a.studentRef.regNo})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {a.message}
                </div>
                {a.channels?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    via {a.channels.map(c => c === 'email' ? '📧 Email' : c === 'push' ? '🔔 Push' : '💬 SMS').join(', ')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                  <div>{format(new Date(a.sentAt), 'dd MMM yyyy')}</div>
                  <div>{format(new Date(a.sentAt), 'hh:mm a')}</div>
                </div>
                <span className={`badge ${a.status === 'SENT' || a.status === 'DELIVERED' ? 'badge-green' : 'badge-red'}`}>
                  {a.status}
                </span>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm btn-icon" title="Delete"
                    onClick={() => deleteAlert(a._id)}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <SendModal
          onClose={() => setShowModal(false)}
          onSent={load}
          students={students}
          classes={classes}
        />
      )}
    </div>
  );
}
