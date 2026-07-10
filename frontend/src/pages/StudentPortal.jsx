// frontend/src/pages/StudentPortal.jsx
import { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, CheckCircle, Clock, IndianRupee, Bell, ClipboardList, Plus, X, Check } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ─── Leave Apply Form (outside to prevent focus loss) ─────────────────────────
function LeaveForm({ form, setForm, onSubmit, onClose, saving }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label className="form-label">Leave Type *</label>
        <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="MEDICAL">Medical Leave</option>
          <option value="OD">On Duty (OD)</option>
          <option value="CASUAL">Casual Leave</option>
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">From Date *</label>
          <input type="date" className="form-input" value={form.fromDate} required
            onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">To Date *</label>
          <input type="date" className="form-input" value={form.toDate} required min={form.fromDate}
            onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Reason *</label>
        <textarea className="form-input" rows={3} value={form.reason} required
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="Describe the reason..." style={{ resize: 'vertical' }} />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Submit</>}
        </button>
      </div>
    </form>
  );
}

// ─── Attendance Ring ───────────────────────────────────────────────────────────
function AttendanceRing({ pct, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const stroke = (pct / 100) * circ;
  const color = pct >= 75 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${stroke} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontSize: size / 5, fontWeight: 800, fill: color }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Main Student Portal ───────────────────────────────────────────────────────
export default function StudentPortal() {
  const { user } = useAuth();
  const [student, setStudent]     = useState(null);
  const [subjectStats, setSubjectStats] = useState([]);
  const [fees, setFees]           = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [overallPct, setOverallPct] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'MEDICAL', fromDate: '', toDate: '', reason: '' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Fetch the student record linked to this login
      const stuRes = await api.get('/students/me').catch(err => {
        if (err.response?.status === 404) return null;
        throw err;
      });

      const stu = stuRes?.data;
      if (stu) {
        setStudent(stu);

        // Use allSettled so one failure doesn't kill everything
        const [attRes, feeRes, leaveRes, alertRes] = await Promise.allSettled([
          api.get(`/attendance/subject-summary/${stu._id}`),
          api.get('/fees/me'),
          api.get('/leaves'),
          api.get('/alerts'),
        ]);

        const stats = attRes.status === 'fulfilled' ? attRes.value.data : [];
        setSubjectStats(stats);
        setFees(feeRes.status === 'fulfilled' ? feeRes.value.data : []);
        setLeaves(leaveRes.status === 'fulfilled' ? leaveRes.value.data : []);
        setAlerts(alertRes.status === 'fulfilled' ? (alertRes.value.data?.slice(0, 15) || []) : []);

        // Log any failures for debugging
        [attRes, feeRes, leaveRes, alertRes].forEach((r, i) => {
          if (r.status === 'rejected') {
            const names = ['attendance', 'fees', 'leaves', 'alerts'];
            console.warn(`StudentPortal: ${names[i]} failed:`, r.reason?.response?.data?.message || r.reason?.message);
          }
        });

        const totalClasses = stats.reduce((s, g) => s + g.total, 0);
        const totalPresent = stats.reduce((s, g) => s + g.present, 0);
        setOverallPct(totalClasses > 0 ? +((totalPresent / totalClasses) * 100).toFixed(1) : 0);
      }
    } catch (err) {
      // Only fires if /students/me itself throws (not a 404)
      console.error('StudentPortal critical error:', err);
    }
    setLoading(false);
  };

  const submitLeave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/leaves', { ...leaveForm, student: student?._id });
      toast.success('Leave application submitted!');
      setLeaveModal(false);
      const leaveRes = await api.get('/leaves');
      setLeaves(leaveRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave');
    }
    setSaving(false);
  };

  const withdrawLeave = async (id) => {
    if (!confirm('Withdraw this leave request?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      toast.success('Leave withdrawn');
      const leaveRes = await api.get('/leaves');
      setLeaves(leaveRes.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const STATUS_COLOR = { PENDING: '#d97706', APPROVED: '#059669', REJECTED: '#dc2626' };
  const STATUS_ICON  = { PENDING: '⏳', APPROVED: '✅', REJECTED: '❌' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--primary)' }} />
    </div>
  );

  // Account not linked to a student record yet
  if (!loading && !student) return (
    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #fed7aa' }}>
          <span style={{ fontSize: '2.5rem' }}>🔗</span>
        </div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Account Not Linked</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
          Your login account hasn't been linked to a student record yet.<br />
          Please ask your <strong>admin</strong> to go to <strong>User Management → Edit your account → Link Student Record</strong>.
        </p>
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', textAlign: 'left', fontSize: '0.82rem' }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--primary)' }}>📋 Admin steps:</p>
          <ol style={{ paddingLeft: 18, color: 'var(--text-dim)', lineHeight: 2 }}>
            <li>Go to <strong>User Management</strong></li>
            <li>Find <strong>{user?.name}</strong>'s account</li>
            <li>Click ✏️ Edit</li>
            <li>Select your student record from the dropdown</li>
            <li>Click Save</li>
          </ol>
        </div>
        <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-dim)' }}>Logged in as: {user?.email}</p>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">🎓 Student Portal</h2>
          <p className="page-subtitle">
            {student ? `${student.name} · ${student.regNo} · ${student.class}` : `Welcome, ${user?.name}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setLeaveForm({ type: 'MEDICAL', fromDate: '', toDate: '', reason: '' }); setLeaveModal(true); }}>
          <Plus size={14} /> Apply for Leave
        </button>
      </div>

      {/* ── KPI summary row ─────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: 20 }}>
        {/* Overall attendance ring */}
        <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20 }}>
          <AttendanceRing pct={overallPct} size={90} />
          <div style={{ textAlign: 'center' }}>
            <div className="kpi-label">Overall Attendance</div>
            <div style={{ fontSize: '0.78rem', color: overallPct < 75 ? '#dc2626' : '#059669', fontWeight: 700 }}>
              {overallPct >= 75 ? '✅ Eligible' : '⚠️ At Risk'}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green"><BookOpen size={20} /></div>
          <div>
            <div className="kpi-label">Subjects</div>
            <div className="kpi-value">{subjectStats.length}</div>
            <div className="kpi-sub">{subjectStats.filter(s => s.isBarred).length} at risk</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon yellow"><IndianRupee size={20} /></div>
          <div>
            <div className="kpi-label">Fee Balance</div>
            <div className="kpi-value">
              ₹{fees.reduce((s, f) => s + (f.balance || 0), 0).toLocaleString('en-IN')}
            </div>
            <div className="kpi-sub">{fees.filter(f => !f.paidStatus).length} pending</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple"><ClipboardList size={20} /></div>
          <div>
            <div className="kpi-label">Leaves</div>
            <div className="kpi-value">{leaves.length}</div>
            <div className="kpi-sub">{leaves.filter(l => l.status === 'PENDING').length} pending</div>
          </div>
        </div>
      </div>

      {/* ── Barred warning ──────────────────────────────────────────────────── */}
      {subjectStats.some(s => s.isBarred) && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={20} color="#d97706" />
          <div>
            <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 2 }}>⚠️ Low Attendance Warning</p>
            <p style={{ fontSize: '0.8rem', color: '#92400e' }}>
              You have below 75% attendance in {subjectStats.filter(s => s.isBarred).length} subject(s). You may be barred from exams. Contact your HOD.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {[
          { key: 'attendance', label: '📊 Attendance', icon: BookOpen },
          { key: 'fees',       label: '💰 Fees',       icon: IndianRupee },
          { key: 'leaves',     label: '📋 Leaves',     icon: ClipboardList },
          { key: 'alerts',     label: '🔔 Alerts',     icon: Bell },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2, fontSize: '0.88rem' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Attendance Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div>
          {subjectStats.length === 0 ? (
            <div className="empty-state"><h3>No attendance records</h3><p>Your attendance will appear here once marked by faculty</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {subjectStats.map(s => {
                const color = s.percentage >= 75 ? '#059669' : s.percentage >= 60 ? '#d97706' : '#dc2626';
                const bg    = s.percentage >= 75 ? '#ecfdf5' : s.percentage >= 60 ? '#fffbeb' : '#fef2f2';
                return (
                  <div key={s.subjectId || s.subjectName} className="card" style={{ padding: 18, border: s.isBarred ? '1.5px solid #fca5a5' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.subjectName}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {s.subjectCode}{s.isLab ? ' · Lab (2×)' : ''}
                        </p>
                      </div>
                      <AttendanceRing pct={s.percentage} size={64} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Present', value: s.present, color: '#059669', bg: '#ecfdf5' },
                        { label: 'Absent',  value: s.absent,  color: '#dc2626', bg: '#fef2f2' },
                        { label: 'Leave',   value: s.leave,   color: '#d97706', bg: '#fffbeb' },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center', background: item.bg, borderRadius: 6, padding: '6px 4px' }}>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: '0.67rem', color: '#64748b' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="progress-bar" style={{ marginTop: 12 }}>
                      <div className={`progress-fill ${s.percentage >= 75 ? 'green' : s.percentage >= 60 ? 'yellow' : 'red'}`}
                        style={{ width: `${s.percentage}%` }} />
                    </div>
                    {s.isBarred && (
                      <div style={{ marginTop: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>
                        ⛔ Below 75% — Exam eligibility at risk
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Fees Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        <div>
          {fees.length === 0 ? (
            <div className="empty-state"><h3>No fee records</h3><p>Fee records will appear here once created</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fees.map(f => (
                <div key={f._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.paidStatus ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {f.paidStatus ? <CheckCircle size={22} color="#059669" /> : <Clock size={22} color="#dc2626" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700 }}>Semester {f.semester} · {f.academicYear}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>₹{f.totalAmount?.toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: '0.75rem', color: '#059669' }}>Paid: ₹{f.paidAmount?.toLocaleString('en-IN')}</p>
                    {f.balance > 0 && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>Due: ₹{f.balance?.toLocaleString('en-IN')}</p>}
                  </div>
                  <div>
                    {f.paidStatus
                      ? <span className="badge badge-green">✅ Paid</span>
                      : <span className="badge badge-red">⏳ Pending</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Leaves Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => { setLeaveForm({ type: 'MEDICAL', fromDate: '', toDate: '', reason: '' }); setLeaveModal(true); }}>
              <Plus size={14} /> Apply for Leave
            </button>
          </div>
          {leaves.length === 0 ? (
            <div className="empty-state"><h3>No leave applications</h3><p>Your leave requests will appear here</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaves.map(l => (
                <div key={l._id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ fontSize: '1.5rem' }}>{STATUS_ICON[l.status]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-blue">{l.type}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>{l.reason}</p>
                    {l.approverNote && (
                      <p style={{ fontSize: '0.78rem', marginTop: 6, background: '#f5f3ff', borderRadius: 4, padding: '4px 8px', color: '#5b21b6' }}>
                        💬 {l.approverNote}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: STATUS_COLOR[l.status] }}>
                      {l.status}
                    </span>
                    {l.status === 'PENDING' && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => withdrawLeave(l._id)}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alerts Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="empty-state"><h3>No notifications</h3><p>Absence alerts and fee reminders will appear here</p></div>
          ) : (
            alerts.map(a => (
              <div key={a._id} className="alert-item">
                <div className="alert-icon">🔔</div>
                <div>
                  <div className="alert-title">{a.studentName} — {a.type}</div>
                  <div className="alert-meta">{a.message} · {new Date(a.sentAt || a.createdAt).toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Leave Modal ──────────────────────────────────────────────────────── */}
      {leaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLeaveModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Apply for Leave</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setLeaveModal(false)}><X size={14} /></button>
            </div>
            <LeaveForm form={leaveForm} setForm={setLeaveForm}
              onSubmit={submitLeave} onClose={() => setLeaveModal(false)} saving={saving} />
          </div>
        </div>
      )}
    </div>
  );
}
