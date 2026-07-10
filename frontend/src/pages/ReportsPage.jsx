// frontend/src/pages/ReportsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, AlertTriangle, Users } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [semesters, setSemesters]   = useState([]);
  const [classes, setClasses]       = useState([]);
  const [barred, setBarred]         = useState([]);
  const [form, setForm]             = useState({ class: '', semester: '', from: '', to: '' });
  const [loading, setLoading]       = useState(false);
  const [barredLoading, setBarredLoading] = useState(false);

  useEffect(() => {
    api.get('/academic-years').then(r => {
      const allSems = r.data.flatMap(y => y.semesters || []);
      setSemesters(allSems);
      const active = allSems.find(s => s.isActive);
      if (active) setForm(f => ({ ...f, semester: active._id }));
    });
    api.get('/students/meta/classes').then(r => setClasses(r.data));
  }, []);

  const downloadPDF = async () => {
    if (!form.class || !form.from || !form.to) return toast.error('Select class, from and to dates');
    setLoading(true);
    try {
      const res = await api.get('/reports/attendance/pdf', {
        params: { class: form.class, semester: form.semester, from: form.from, to: form.to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `attendance_${form.class}_${form.from}.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF'); }
    setLoading(false);
  };

  const downloadExcel = async () => {
    if (!form.class || !form.from || !form.to) return toast.error('Select class, from and to dates');
    setLoading(true);
    try {
      const res = await api.get('/reports/attendance/excel', {
        params: { class: form.class, semester: form.semester, from: form.from, to: form.to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `attendance_${form.class}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Excel downloaded!');
    } catch { toast.error('Failed to generate Excel'); }
    setLoading(false);
  };

  const fetchBarred = async () => {
    if (!form.class) return toast.error('Select a class first');
    setBarredLoading(true);
    try {
      const res = await api.get('/attendance/barred', {
        params: { class: form.class, semester: form.semester },
      });
      setBarred(res.data);
      if (res.data.length === 0) toast.success('No barred students! 🎉');
    } catch { toast.error('Failed to fetch barred list'); }
    setBarredLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Export</h2>
          <p className="page-subtitle">Download attendance registers, barred students list</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>
          Select Parameters
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 160, margin: 0 }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 200, margin: 0 }}>
            <label className="form-label">Semester</label>
            <select className="form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s._id} value={s._id}>Sem {s.number} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={form.from}
              onChange={e => setForm(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={form.to} min={form.from}
              onChange={e => setForm(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* PDF Register */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} color="#dc2626" />
            </div>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>Attendance Register</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Monthly PDF — printable format</p>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            A4/A3 landscape register with date columns. Students below 75% highlighted in red.
          </p>
          <button className="btn btn-primary" onClick={downloadPDF} disabled={loading} style={{ marginTop: 'auto' }}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Download size={14} /> Download PDF</>}
          </button>
        </div>

        {/* Excel Export */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={22} color="#16a34a" />
            </div>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>Excel Export</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Date-wise attendance in .xlsx</p>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Spreadsheet with Present/Absent/Leave per date. Includes % totals per student.
          </p>
          <button className="btn btn-success" onClick={downloadExcel} disabled={loading} style={{ marginTop: 'auto' }}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Download size={14} /> Download Excel</>}
          </button>
        </div>

        {/* Barred List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="#d97706" />
            </div>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>Barred Students</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Below 75% in any subject</p>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Auto-generates list of students not eligible for exams due to low attendance.
          </p>
          <button className="btn btn-ghost" onClick={fetchBarred} disabled={barredLoading} style={{ marginTop: 'auto', border: '1px solid #d97706', color: '#d97706' }}>
            {barredLoading ? <span className="spinner" /> : <><Users size={14} /> Generate Barred List</>}
          </button>
        </div>
      </div>

      {/* Barred list result */}
      {barred.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={18} color="#d97706" />
            <h3 style={{ margin: 0, color: '#d97706', fontWeight: 700 }}>Barred Students — {barred.length} student(s)</h3>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.8rem', color: '#7c2d12' }}>
            ⚠️ These students have below 75% attendance in one or more subjects and may not be eligible to appear for exams.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Reg No</th><th>Student Name</th><th>Class</th></tr>
              </thead>
              <tbody>
                {barred.map(s => (
                  <tr key={s._id}>
                    <td><span className="badge badge-red">{s.regNo}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.class}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
