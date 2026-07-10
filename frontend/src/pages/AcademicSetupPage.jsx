// frontend/src/pages/AcademicSetupPage.jsx
// Manages: Departments, Academic Years, Semesters in one tabbed page
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Check, X, Star, Building2, CalendarDays, BookOpen } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─── Departments Tab ──────────────────────────────────────────────────────────
function DepartmentsTab() {
  const [depts, setDepts]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState({ name: '', code: '', hod: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [dRes, uRes] = await Promise.all([api.get('/departments'), api.get('/users')]);
    setDepts(dRes.data);
    setUsers(uRes.data.filter(u => u.role === 'teacher' || u.role === 'admin'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ name: '', code: '', hod: '' }); setEditing(null); setModal(true); };
  const openEdit = (d) => { setForm({ name: d.name, code: d.code, hod: d.hod?._id || '' }); setEditing(d); setModal(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/departments/${editing._id}`, form);
      else         await api.post('/departments', form);
      toast.success(editing ? 'Department updated' : 'Department created');
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Department</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Department</th><th>HOD</th><th>Actions</th></tr></thead>
            <tbody>
              {depts.map(d => (
                <tr key={d._id}>
                  <td><span className="badge badge-blue">{d.code}</span></td>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td style={{ fontSize: '0.83rem' }}>{d.hod?.name || <span style={{ color: 'var(--text-dim)' }}>Not assigned</span>}</td>
                  <td><button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(d)}><Edit size={13}/></button></td>
                </tr>
              ))}
              {depts.length === 0 && <tr><td colSpan={4}><div className="empty-state"><h3>No departments</h3><p>Add your first department</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit' : 'Add'} Department</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14}/></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department Name *</label>
                  <input className="form-input" value={form.name} required
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Electronics & Communication Engg." />
                </div>
                <div className="form-group" style={{ maxWidth: 120 }}>
                  <label className="form-label">Code *</label>
                  <input className="form-input" value={form.code} required maxLength={6}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ECE" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Head of Department (HOD)</label>
                <select className="form-select" value={form.hod} onChange={e => setForm(f => ({ ...f, hod: e.target.value }))}>
                  <option value="">-- Select HOD --</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14}/> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Academic Years Tab ───────────────────────────────────────────────────────
function AcademicYearsTab() {
  const [years, setYears]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [semModal, setSemModal] = useState(null); // yearId for add semester
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState({ label: '', startDate: '', endDate: '', periodsPerDay: 6, periodDuration: 60 });
  const [semForm, setSemForm] = useState({ number: 1, name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get('/academic-years');
    setYears(res.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ label: '', startDate: '', endDate: '', periodsPerDay: 6, periodDuration: 60 }); setEditing(null); setModal(true); };
  const openEdit = (y) => { setForm({ label: y.label, startDate: y.startDate?.substring(0,10), endDate: y.endDate?.substring(0,10), periodsPerDay: y.periodsPerDay, periodDuration: y.periodDuration }); setEditing(y); setModal(true); };

  const saveYear = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/academic-years/${editing._id}`, form);
      else         await api.post('/academic-years', form);
      toast.success('Saved!'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const activateYear = async (y) => {
    try {
      await api.put(`/academic-years/${y._id}`, { isActive: true });
      toast.success(`${y.label} set as active year`); load();
    } catch { toast.error('Failed'); }
  };

  const addSemester = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/academic-years/${semModal}/semesters`, semForm);
      toast.success('Semester added!'); setSemModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const activateSem = async (sem) => {
    try {
      await api.put(`/academic-years/semesters/${sem._id}`, { isActive: true });
      toast.success(`Semester ${sem.number} set as active`); load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Academic Year</button>
      </div>

      {years.map(y => (
        <div key={y._id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {y.isActive && <span className="badge badge-green"><span className="dot dot-green"/>Active</span>}
              <h4 style={{ margin: 0, fontWeight: 700 }}>{y.label}</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                {new Date(y.startDate).toLocaleDateString('en-IN')} — {new Date(y.endDate).toLocaleDateString('en-IN')}
              </span>
              <span className="badge badge-blue">{y.periodsPerDay} periods/day</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!y.isActive && <button className="btn btn-ghost btn-sm" onClick={() => activateYear(y)}><Star size={12}/> Set Active</button>}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(y)}><Edit size={13}/></button>
              <button className="btn btn-primary btn-sm" onClick={() => { setSemModal(y._id); setSemForm({ number: (y.semesters?.length || 0) + 1, name: '', startDate: '', endDate: '' }); }}>
                <Plus size={13}/> Add Semester
              </button>
            </div>
          </div>

          {/* Semesters */}
          {y.semesters?.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {y.semesters.map(s => (
                <div key={s._id} style={{ background: s.isActive ? 'var(--primary-pale)' : 'var(--bg-input)', border: `1px solid ${s.isActive ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>Sem {s.number}</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>{s.name}</span>
                  {s.isActive ? <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>● ACTIVE</span>
                    : <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => activateSem(s)}>Activate</button>}
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>No semesters yet</p>}
        </div>
      ))}

      {years.length === 0 && <div className="empty-state"><h3>No academic years</h3><p>Create your first academic year to get started</p></div>}

      {/* Year Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit' : 'New'} Academic Year</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14}/></button>
            </div>
            <form onSubmit={saveYear}>
              <div className="form-group"><label className="form-label">Label *</label>
                <input className="form-input" value={form.label} required placeholder="2024-2025"
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Start Date *</label>
                  <input type="date" className="form-input" value={form.startDate} required
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">End Date *</label>
                  <input type="date" className="form-input" value={form.endDate} required
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Periods Per Day</label>
                  <input type="number" className="form-input" min={1} max={12} value={form.periodsPerDay}
                    onChange={e => setForm(f => ({ ...f, periodsPerDay: Number(e.target.value) }))} /></div>
                <div className="form-group"><label className="form-label">Period Duration (min)</label>
                  <input type="number" className="form-input" min={30} max={120} value={form.periodDuration}
                    onChange={e => setForm(f => ({ ...f, periodDuration: Number(e.target.value) }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14}/> Save Year</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Modal */}
      {semModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSemModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Semester</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSemModal(null)}><X size={14}/></button>
            </div>
            <form onSubmit={addSemester}>
              <div className="form-row">
                <div className="form-group" style={{ maxWidth: 120 }}><label className="form-label">Semester No *</label>
                  <input type="number" className="form-input" min={1} max={8} value={semForm.number} required
                    onChange={e => setSemForm(f => ({ ...f, number: Number(e.target.value) }))} /></div>
                <div className="form-group"><label className="form-label">Name *</label>
                  <input className="form-input" value={semForm.name} required placeholder="Odd Semester 2024"
                    onChange={e => setSemForm(f => ({ ...f, name: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={semForm.startDate}
                    onChange={e => setSemForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={semForm.endDate}
                    onChange={e => setSemForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setSemModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14}/> Add Semester</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'years',  label: 'Academic Years & Semesters', icon: CalendarDays },
  { key: 'depts',  label: 'Departments',                icon: Building2 },
];

export default function AcademicSetupPage() {
  const [tab, setTab] = useState('years');
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Academic Setup</h2>
          <p className="page-subtitle">Configure departments, academic years, and semesters</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2, fontSize: '0.9rem' }}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>

      {tab === 'years' && <AcademicYearsTab />}
      {tab === 'depts' && <DepartmentsTab />}
    </div>
  );
}
