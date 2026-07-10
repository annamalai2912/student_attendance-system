// frontend/src/pages/SubjectsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, X, Check, BookOpen, Clock, Trash2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ─── SubjectForm — outside to prevent focus loss ──────────────────────────────
function SubjectForm({ form, setForm, onSubmit, onClose, saving, faculty }) {
  return (
    <form onSubmit={onSubmit}>
      {/* Name + Code */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Subject Name *</label>
          <input className="form-input" value={form.name} required placeholder="e.g. Digital Signal Processing"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group" style={{ maxWidth: 130 }}>
          <label className="form-label">Code *</label>
          <input className="form-input" value={form.code} required placeholder="EC401"
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
        </div>
      </div>

      {/* Department + Semester */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Department *</label>
          <input className="form-input" value={form.department} required placeholder="e.g. ECE, CSE, MECH"
            onChange={e => setForm(f => ({ ...f, department: e.target.value.toUpperCase() }))} />
        </div>
        <div className="form-group" style={{ maxWidth: 140 }}>
          <label className="form-label">Semester *</label>
          <select className="form-select" value={form.semester} required
            onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))}>
            <option value="">Select</option>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </div>
      </div>

      {/* Class + Batch */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Class *</label>
          <input className="form-input" value={form.class} required placeholder="e.g. ECE-B"
            onChange={e => setForm(f => ({ ...f, class: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Batch</label>
          <input className="form-input" value={form.batch} placeholder="e.g. 2021-2025"
            onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
        </div>
      </div>

      {/* Faculty + Periods */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Assigned Faculty</label>
          <select className="form-select" value={form.faculty}
            onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}>
            <option value="">-- Unassigned --</option>
            {faculty.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: 160 }}>
          <label className="form-label">Periods / Week</label>
          <input type="number" className="form-input" min={1} max={20} value={form.periodsPerWeek}
            onChange={e => setForm(f => ({ ...f, periodsPerWeek: Number(e.target.value) }))} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', marginBottom: 6 }}>
        <input type="checkbox" checked={form.isLab}
          onChange={e => setForm(f => ({ ...f, isLab: e.target.checked }))} />
        🔬 This is a Lab subject (counts 2× in attendance)
      </label>

      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Save Subject</>}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', code: '', department: '', semester: '', class: '', batch: '', faculty: '', periodsPerWeek: 4, isLab: false };

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterDept, setFilterDept]   = useState('');
  const [filterSem, setFilterSem]     = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  // Derived lists for filters
  const departments = [...new Set(subjects.map(s => s.department))].filter(Boolean).sort();
  const classes     = [...new Set(subjects.map(s => s.class))].filter(Boolean).sort();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDept)  params.department = filterDept;
      if (filterSem)   params.semester   = filterSem;
      if (filterClass) params.class      = filterClass;

      const [sRes, uRes] = await Promise.all([
        api.get('/subjects', { params }),
        api.get('/users?role=teacher').catch(() => ({ data: [] })), // fallback if no teachers
      ]);
      setSubjects(sRes.data);
      setFaculty(uRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load subjects');
    }
    setLoading(false);
  }, [filterDept, filterSem, filterClass]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ ...EMPTY_FORM, department: filterDept || '', class: filterClass || '' }); setEditing(null); setModal(true); };
  const openEdit = (s) => {
    setForm({
      name: s.name, code: s.code,
      department: s.department || '',
      semester: s.semester || '',
      class: s.class, batch: s.batch || '',
      faculty: s.faculty?._id || '',
      periodsPerWeek: s.periodsPerWeek || 4,
      isLab: s.isLab || false,
    });
    setEditing(s); setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.faculty) delete payload.faculty;
      if (editing) await api.put(`/subjects/${editing._id}`, payload);
      else         await api.post('/subjects', payload);
      toast.success(editing ? 'Subject updated ✅' : 'Subject created ✅');
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save subject');
    }
    setSaving(false);
  };

  const deleteSubject = async (s) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    try {
      await api.delete(`/subjects/${s._id}`);
      toast.success('Subject removed'); load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Subjects</h2>
          <p className="page-subtitle">{subjects.length} subjects · manage per class and semester</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Subject</button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ minWidth: 150, margin: 0 }} value={filterDept}
          onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="form-select" style={{ minWidth: 160, margin: 0 }} value={filterSem}
          onChange={e => setFilterSem(e.target.value)}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
        </select>
        <select className="form-select" style={{ minWidth: 140, margin: 0 }} value={filterClass}
          onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
        {(filterDept || filterSem || filterClass) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDept(''); setFilterSem(''); setFilterClass(''); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Subject</th><th>Dept</th><th>Sem</th>
                <th>Class</th><th>Faculty</th><th>Periods/Wk</th><th>Type</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ margin: 'auto', width: 26, height: 26, borderTopColor: 'var(--primary)' }} />
                </td></tr>
              )}
              {!loading && subjects.map(s => (
                <tr key={s._id}>
                  <td><span className="badge badge-blue">{s.code}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{s.department}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>Sem {s.semester}</td>
                  <td style={{ fontSize: '0.82rem' }}>{s.class} <span style={{ color: 'var(--text-dim)' }}>{s.batch && `· ${s.batch}`}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{s.faculty?.name || <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color="var(--text-dim)" /> {s.periodsPerWeek}
                    </span>
                  </td>
                  <td>{s.isLab ? <span className="badge badge-orange">🔬 Lab</span> : <span className="badge">Theory</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(s)}><Edit size={13} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => deleteSubject(s)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && subjects.length === 0 && (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <BookOpen size={36} />
                    <h3>No subjects yet</h3>
                    <p>Click <strong>Add Subject</strong> to get started</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? '✏️ Edit Subject' : '➕ Add Subject'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <SubjectForm
              form={form} setForm={setForm}
              onSubmit={save} onClose={() => setModal(false)}
              saving={saving} faculty={faculty}
            />
          </div>
        </div>
      )}
    </div>
  );
}
