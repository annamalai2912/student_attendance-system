// frontend/src/pages/LeavesPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Clock, FileText, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  PENDING:  { cls: 'badge-orange', label: '⏳ Pending' },
  APPROVED: { cls: 'badge-green',  label: '✅ Approved' },
  REJECTED: { cls: 'badge-red',    label: '❌ Rejected' },
};

// ─── ApplyForm outside to prevent focus loss ──────────────────────────────────
function ApplyForm({ form, setForm, students, subjects, onSubmit, onClose, saving }) {
  return (
    <form onSubmit={onSubmit}>
      {students && (
        <div className="form-group"><label className="form-label">Student *</label>
          <select className="form-select" value={form.student} required onChange={e => setForm(f => ({ ...f, student: e.target.value }))}>
            <option value="">Select student</option>
            {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.regNo})</option>)}
          </select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Leave Type *</label>
          <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="MEDICAL">Medical Leave</option>
            <option value="OD">On Duty (OD)</option>
            <option value="CASUAL">Casual Leave</option>
          </select></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">From Date *</label>
          <input type="date" className="form-input" value={form.fromDate} required
            onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">To Date *</label>
          <input type="date" className="form-input" value={form.toDate} required min={form.fromDate}
            onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} /></div>
      </div>
      <div className="form-group"><label className="form-label">Reason *</label>
        <textarea className="form-input" rows={3} value={form.reason} required
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="Describe the reason for leave..." style={{ resize: 'vertical' }} /></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14}/> Submit Leave</button>
      </div>
    </form>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ leave, onClose, onDone }) {
  const [status, setStatus]   = useState('APPROVED');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/leaves/${leave._id}/review`, { status, approverNote: note });
      toast.success(`Leave ${status.toLowerCase()}`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title">Review Leave Request</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.84rem' }}>
          <p><strong>{leave.student?.name}</strong> ({leave.student?.regNo})</p>
          <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>{leave.type} · {new Date(leave.fromDate).toLocaleDateString('en-IN')} — {new Date(leave.toDate).toLocaleDateString('en-IN')}</p>
          <p style={{ marginTop: 6 }}>{leave.reason}</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Decision *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['APPROVED','REJECTED'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
                  {s === 'APPROVED' ? '✅ Approve' : '❌ Reject'}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group"><label className="form-label">Comments</label>
            <textarea className="form-input" rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Optional remarks..." style={{ resize: 'vertical' }} /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14}/> Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves]     = useState([]);
  const [students, setStudents] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal]       = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [form, setForm]         = useState({ student: '', type: 'MEDICAL', fromDate: '', toDate: '', reason: '' });
  const [saving, setSaving]     = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const [lRes] = await Promise.all([api.get('/leaves', { params })]);
      setLeaves(lRes.data);
    } catch { toast.error('Failed to load leaves'); }
  }, [filterStatus]);

  useEffect(() => {
    load();
    if (isAdmin) api.get('/students').then(r => setStudents(r.data));
  }, [load, isAdmin]);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave application submitted!'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const withdraw = async (id) => {
    if (!confirm('Withdraw this leave request?')) return;
    await api.delete(`/leaves/${id}`);
    toast.success('Leave withdrawn'); load();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Leave Management</h2>
          <p className="page-subtitle">Medical, OD, and casual leave requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ student: '', type: 'MEDICAL', fromDate: '', toDate: '', reason: '' }); setModal(true); }}>
          <Plus size={14}/> Apply for Leave
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Leaves list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leaves.map(l => (
          <div key={l._id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className={`badge ${STATUS_BADGE[l.status]?.cls}`}>{STATUS_BADGE[l.status]?.label}</span>
                <span className="badge badge-blue">{l.type}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{l.student?.name}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>({l.student?.regNo})</span>
              </div>
              <p style={{ fontSize: '0.83rem', marginBottom: 4 }}>
                <strong>Dates:</strong> {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
              </p>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>{l.reason}</p>
              {l.approverNote && (
                <p style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: 4, background: '#f5f3ff', borderRadius: 4, padding: '4px 8px' }}>
                  💬 {l.approverNote}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isAdmin && l.status === 'PENDING' && (
                <button className="btn btn-primary btn-sm" onClick={() => setReviewing(l)}>Review</button>
              )}
              {l.status === 'PENDING' && (
                <button className="btn btn-ghost btn-sm" onClick={() => withdraw(l._id)}>Withdraw</button>
              )}
            </div>
          </div>
        ))}
        {leaves.length === 0 && <div className="empty-state"><h3>No leave requests</h3><p>No records found for the selected filter</p></div>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Apply for Leave</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14}/></button>
            </div>
            <ApplyForm form={form} setForm={setForm} students={isAdmin ? students : null}
              onSubmit={submit} onClose={() => setModal(false)} saving={saving} />
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewModal leave={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />
      )}
    </div>
  );
}
