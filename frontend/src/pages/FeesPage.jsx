// frontend/src/pages/FeesPage.jsx
import { useState, useEffect } from 'react';
import { Plus, X, Check, IndianRupee, CreditCard } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EMPTY_FEE = { studentRef: '', semester: 1, academicYear: '2025-2026', totalAmount: '', paidAmount: 0, dueDate: '', receipts: [] };

export default function FeesPage() {
  const [fees, setFees]         = useState([]);
  const [students, setStudents] = useState([]);
  const [modal, setModal]       = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [form, setForm]         = useState(EMPTY_FEE);
  const [payForm, setPayForm]   = useState({ amount: '', transactionID: '' });
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState({});

  const load = async () => {
    const [feesRes, statsRes, stuRes] = await Promise.all([
      api.get('/fees'),
      api.get('/fees/stats/summary'),
      api.get('/students?isActive=true'),
    ]);
    setFees(feesRes.data);
    setStats(statsRes.data);
    setStudents(stuRes.data);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/fees', form);
      toast.success('Fee record created');
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setLoading(false);
  };

  const handlePay = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/fees/${payModal._id}/pay`, { amount: Number(payForm.amount), transactionID: payForm.transactionID });
      toast.success('Payment recorded');
      setPayModal(null); setPayForm({ amount: '', transactionID: '' }); load();
    } catch (err) { toast.error('Payment failed'); }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fee Management</h2>
          <p className="page-subtitle">Track payments and outstanding dues</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FEE); setModal(true); }}><Plus size={15} /> Add Fee Record</button>
      </div>

      {/* Summary cards */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Collected', value: `₹${((stats.totalPaid||0)/1000).toFixed(1)}K`, colorClass: 'green', icon: Check },
          { label: 'Total Pending',   value: `₹${((stats.totalDue||0)/1000).toFixed(1)}K`,  colorClass: 'yellow', icon: IndianRupee },
          { label: 'Paid Students',   value: stats.paidCount || 0,   colorClass: 'blue', icon: CreditCard },
          { label: 'Unpaid Students', value: stats.unpaidCount || 0, colorClass: 'red',  icon: X },
        ].map(c => (
          <div key={c.label} className="kpi-card">
            <div className={`kpi-icon ${c.colorClass}`}><c.icon size={20} /></div>
            <div><div className="kpi-label">{c.label}</div><div className="kpi-value">{c.value}</div></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Student</th><th>Semester</th><th>Total</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {fees.map(f => {
                const pct = f.totalAmount > 0 ? (f.paidAmount / f.totalAmount * 100) : 0;
                const overdue = !f.paidStatus && new Date(f.dueDate) < new Date();
                return (
                  <tr key={f._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.studentRef?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{f.studentRef?.regNo}</div>
                    </td>
                    <td>Sem {f.semester} · {f.academicYear}</td>
                    <td style={{ fontWeight: 600 }}>₹{f.totalAmount?.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--success)' }}>₹{f.paidAmount?.toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ color: f.balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        ₹{(f.balance||0).toLocaleString('en-IN')}
                      </div>
                      <div className="progress-bar" style={{ marginTop: 4, width: 80 }}>
                        <div className={`progress-fill ${pct > 75 ? 'green' : pct > 40 ? 'yellow' : 'red'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {f.dueDate ? format(new Date(f.dueDate), 'dd MMM yyyy') : '—'}
                      {overdue && <span style={{ fontSize: '0.7rem', marginLeft: 5 }}>⚠️ Overdue</span>}
                    </td>
                    <td>
                      {f.paidStatus
                        ? <span className="badge badge-green">✅ Paid</span>
                        : <span className="badge badge-red">⏳ Pending</span>}
                    </td>
                    <td>
                      {!f.paidStatus && (
                        <button className="btn btn-success btn-sm" onClick={() => { setPayModal(f); setPayForm({ amount: '', transactionID: '' }); }}>
                          <CreditCard size={12} /> Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {fees.length === 0 && <tr><td colSpan={8}><div className="empty-state"><h3>No fee records</h3></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fee Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create Fee Record</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Student *</label>
                <select className="form-select" value={form.studentRef} onChange={e => setForm(f => ({ ...f, studentRef: e.target.value }))} required>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.regNo})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select className="form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input className="form-input" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Amount (₹) *</label>
                  <input type="number" className="form-input" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPayModal(null)}><X size={14} /></button>
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem' }}>
              <strong>{payModal.studentRef?.name}</strong> · Sem {payModal.semester} · Balance: <strong style={{ color: 'var(--danger)' }}>₹{payModal.balance?.toLocaleString('en-IN')}</strong>
            </div>
            <form onSubmit={handlePay}>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹) *</label>
                <input type="number" className="form-input" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} max={payModal.balance} required />
              </div>
              <div className="form-group">
                <label className="form-label">Transaction ID</label>
                <input className="form-input" placeholder="e.g. TXN123456" value={payForm.transactionID} onChange={e => setPayForm(f => ({ ...f, transactionID: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={loading}>{loading ? <span className="spinner" /> : '✅ Confirm Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
