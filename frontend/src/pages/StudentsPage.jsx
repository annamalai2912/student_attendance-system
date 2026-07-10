// frontend/src/pages/StudentsPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Edit, UserX, UserCheck, Upload, Download,
  FileSpreadsheet, X, Check, AlertCircle, CheckCircle
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ─── constants ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  regNo: '', name: '', class: '', batch: '', section: 'A', gender: 'Male', dob: '',
  parent: { name: '', phone: '', email: '', preferredLang: 'en', emailOptIn: true },
};

// ─── StudentForm defined OUTSIDE StudentsPage ─────────────────────────────────
// IMPORTANT: keeping this outside prevents React from recreating the component
// on every render, which would cause inputs to lose focus after each keystroke.
function StudentForm({ form, setForm, onSubmit, onClose, saving }) {
  return (
    <form onSubmit={onSubmit}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Student Info
      </p>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Reg No *</label>
          <input className="form-input" value={form.regNo} required placeholder="21ECE001"
            onChange={e => setForm(f => ({ ...f, regNo: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.name} required
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Class *</label>
          <input className="form-input" value={form.class} required placeholder="ECE-B"
            onChange={e => setForm(f => ({ ...f, class: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Batch *</label>
          <input className="form-input" value={form.batch} required placeholder="2021-2025"
            onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Section</label>
          <input className="form-input" value={form.section} placeholder="A"
            onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select className="form-select" value={form.gender}
            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <input type="date" className="form-input" value={form.dob}
            onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, marginTop: 8 }}>
        Parent / Guardian Info
      </p>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Parent Name *</label>
          <input className="form-input" value={form.parent.name} required
            onChange={e => setForm(f => ({ ...f, parent: { ...f.parent, name: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input className="form-input" value={form.parent.phone} required placeholder="9876543210"
            onChange={e => setForm(f => ({ ...f, parent: { ...f.parent, phone: e.target.value } }))} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input type="email" className="form-input" value={form.parent.email} required
            onChange={e => setForm(f => ({ ...f, parent: { ...f.parent, email: e.target.value } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Preferred Language</label>
          <select className="form-select" value={form.parent.preferredLang}
            onChange={e => setForm(f => ({ ...f, parent: { ...f.parent, preferredLang: e.target.value } }))}>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
          </select>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', marginBottom: 6 }}>
        <input type="checkbox" checked={form.parent.emailOptIn}
          onChange={e => setForm(f => ({ ...f, parent: { ...f.parent, emailOptIn: e.target.checked } }))} />
        Send email alerts to parent
      </label>

      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Save Student</>}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents]         = useState([]);
  const [search, setSearch]             = useState('');
  const [classFilter, setClassFilter]   = useState('');
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]           = useState(true);

  // modals
  const [addModal, setAddModal]         = useState(false);
  const [editModal, setEditModal]       = useState(null);
  const [importModal, setImportModal]   = useState(false);

  // shared form state (used by both add & edit)
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);

  // import state
  const [importFile, setImportFile]     = useState(null);
  const [previewRows, setPreviewRows]   = useState([]);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef  = useRef();
  const dropRef  = useRef();

  // ── data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (classFilter) params.class = classFilter;
      const [stuRes, clsRes] = await Promise.all([
        api.get('/students', { params }),
        api.get('/students/meta/classes'),
      ]);
      let data = stuRes.data;
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.regNo.toLowerCase().includes(q) ||
          s.parent?.name?.toLowerCase().includes(q)
        );
      }
      setStudents(data);
      setClasses(clsRes.data);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  }, [classFilter, search]);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/students', form);
      toast.success('Student added!');
      setAddModal(false); setForm(EMPTY_FORM); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating student'); }
    setSaving(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/students/${editModal._id}`, form);
      toast.success('Student updated!');
      setEditModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error updating student'); }
    setSaving(false);
  };

  const openEdit = (s) => {
    setForm({
      regNo: s.regNo, name: s.name, class: s.class, batch: s.batch,
      section: s.section || 'A', gender: s.gender || 'Male',
      dob: s.dob ? s.dob.substring(0, 10) : '',
      parent: {
        name: s.parent?.name || '', phone: s.parent?.phone || '',
        email: s.parent?.email || '', preferredLang: s.parent?.preferredLang || 'en',
        emailOptIn: s.parent?.emailOptIn !== false,
      },
    });
    setEditModal(s);
  };

  const toggleActive = async (s) => {
    if (!confirm(`${s.isActive ? 'Deactivate' : 'Reactivate'} ${s.name}?`)) return;
    try {
      if (s.isActive) await api.delete(`/students/${s._id}`);
      else            await api.put(`/students/${s._id}`, { isActive: true });
      toast.success(`${s.name} ${s.isActive ? 'deactivated' : 'reactivated'}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  // ── Excel import ───────────────────────────────────────────────────────────
  const parseFile = (file) => {
    setImportFile(file); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setPreviewRows(rows.slice(0, 10));
      } catch { toast.error('Cannot parse file'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const { data } = await api.post('/students/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      toast.success(data.message);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    setImporting(false);
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/students/meta/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'student_import_template.xlsx';
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const resetImport = () => {
    setImportFile(null); setPreviewRows([]); setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-subtitle">{students.length} students · manage records &amp; import from Excel</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => { resetImport(); setImportModal(true); }}>
            <Upload size={15} /> Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setAddModal(true); }}>
            <Plus size={15} /> Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={15} color="#94a3b8" />
          <input placeholder="Search by name or reg no..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ minWidth: 160, margin: 0 }}
          value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Reg No</th>
                <th>Class / Batch</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>
                  <div className="spinner" style={{ margin: 'auto', width: 28, height: 28, borderTopColor: 'var(--primary)' }} />
                </td></tr>
              )}
              {!loading && students.map(s => (
                <tr key={s._id} style={{ opacity: s.isActive ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#1d4ed8', flexShrink: 0 }}>
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>{s.gender} · Sec {s.section}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{s.regNo}</span></td>
                  <td style={{ fontSize: '0.83rem' }}>{s.class} <span style={{ color: 'var(--text-dim)' }}>· {s.batch}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{s.parent?.name}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{s.parent?.phone}</td>
                  <td>
                    {s.isActive
                      ? <span className="badge badge-green"><span className="dot dot-green" /> Active</span>
                      : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(s)}>
                        <Edit size={13} />
                      </button>
                      <button className={`btn btn-sm btn-icon ${s.isActive ? 'btn-danger' : 'btn-success'}`}
                        title={s.isActive ? 'Deactivate' : 'Reactivate'} onClick={() => toggleActive(s)}>
                        {s.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <h3>No students yet</h3>
                    <p>Add individually or import from Excel</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Modal ────────────────────────────────────────────────────── */}
      {addModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Add Student</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setAddModal(false)}><X size={14} /></button>
            </div>
            <StudentForm
              form={form} setForm={setForm}
              onSubmit={handleAdd} onClose={() => setAddModal(false)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit — {editModal.name}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditModal(null)}><X size={14} /></button>
            </div>
            <StudentForm
              form={form} setForm={setForm}
              onSubmit={handleEdit} onClose={() => setEditModal(null)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* ── Import Excel Modal ───────────────────────────────────────────── */}
      {importModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3 className="modal-title">📊 Import Students from Excel</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setImportModal(false)}><X size={14} /></button>
            </div>

            {/* Template download */}
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>📥 Download Template First</p>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-dim)' }}>Fill the Excel template and upload it back. Existing reg nos will be updated automatically.</p>
              </div>
              <button className="btn btn-ghost" style={{ flexShrink: 0 }} onClick={downloadTemplate}>
                <Download size={14} /> Template.xlsx
              </button>
            </div>

            {/* Drop zone */}
            {!importResult && (
              <div
                ref={dropRef}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${importFile ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '28px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  background: importFile ? 'var(--primary-pale)' : 'var(--bg-input)',
                  transition: 'all 0.2s ease', marginBottom: 16,
                }}
              >
                <FileSpreadsheet size={36} color={importFile ? 'var(--primary)' : '#94a3b8'} style={{ marginBottom: 10 }} />
                {importFile ? (
                  <>
                    <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{importFile.name}</p>
                    <p style={{ fontSize: '0.77rem', color: 'var(--text-dim)' }}>{previewRows.length} rows parsed · click to change file</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Drag &amp; drop your Excel file here</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>or click to browse · .xlsx, .xls, .csv</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />
              </div>
            )}

            {/* Preview */}
            {previewRows.length > 0 && !importResult && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Preview (first {previewRows.length} rows)
                </p>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <table style={{ fontSize: '0.78rem', minWidth: 600 }}>
                    <thead>
                      <tr>
                        {Object.keys(previewRows[0]).slice(0, 6).map(k => <th key={k}>{k}</th>)}
                        {Object.keys(previewRows[0]).length > 6 && <th>+more</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).slice(0, 6).map((v, j) => <td key={j}>{String(v)}</td>)}
                          {Object.values(row).length > 6 && <td style={{ color: 'var(--text-dim)' }}>…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <span style={{ fontWeight: 700, color: '#15803d' }}>Import Complete!</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: importResult.errors?.length ? 12 : 0 }}>
                  {[
                    { label: 'New Students', value: importResult.inserted, color: '#16a34a', border: '#bbf7d0' },
                    { label: 'Updated',      value: importResult.updated,  color: '#1d4ed8', border: '#bfdbfe' },
                    { label: 'Skipped',      value: importResult.skipped,  color: '#dc2626', border: '#fecaca' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '10px 8px', border: `1px solid ${item.border}` }}>
                      <div style={{ fontWeight: 800, fontSize: '1.4rem', color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {importResult.errors?.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.78rem', color: '#dc2626', marginBottom: 4 }}>
                      <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Rows with errors:
                    </p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>Row {err.row} ({err.regNo}): {err.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              {importResult ? (
                <>
                  <button className="btn btn-ghost" onClick={resetImport}><Upload size={14} /> Import Another</button>
                  <button className="btn btn-primary" onClick={() => setImportModal(false)}><Check size={14} /> Done</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => setImportModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!importFile || importing} onClick={handleImport}>
                    {importing
                      ? <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Importing...</>
                      : <><Upload size={14} /> Import {previewRows.length ? `(${previewRows.length}+ rows)` : ''}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
