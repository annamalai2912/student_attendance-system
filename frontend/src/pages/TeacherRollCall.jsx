// frontend/src/pages/TeacherRollCall.jsx
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Save, BookOpen, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function TeacherRollCall() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [date, setDate]         = useState(today);
  const [cls, setCls]           = useState(user?.assignedClass || '');
  const [subjectId, setSubjectId] = useState('');
  const [periodNo, setPeriodNo] = useState(1);
  const [classes, setClasses]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords]   = useState([]);
  const [saving, setSaving]     = useState(false);
  const [maxPeriods, setMaxPeriods] = useState(6);

  // Load class list and max periods config
  useEffect(() => {
    api.get('/students/meta/classes').then(r => setClasses(r.data)).catch(console.error);
    api.get('/academic-years').then(r => {
      const active = r.data.find(y => y.isActive);
      if (active?.periodsPerDay) setMaxPeriods(active.periodsPerDay);
    }).catch(() => {});
  }, []);

  // Load subjects when class changes
  useEffect(() => {
    if (!cls) { setSubjects([]); setSubjectId(''); return; }
    // Load ALL subjects — no class filter so naming mismatches don't block
    api.get('/subjects')
      .then(r => {
        setSubjects(r.data);
        setSubjectId(''); // reset selection when class changes
      })
      .catch(() => setSubjects([]));
  }, [cls]);

  const loadClass = useCallback(async () => {
    if (!cls) return toast.error('Select a class first');
    try {
      const { data } = await api.get('/attendance/class', {
        params: { date, class: cls, subjectId: subjectId || undefined, periodNo: periodNo || undefined },
      });
      setRecords(data.map(r => ({ ...r, status: r.status || 'P' })));
      toast.success(`${data.length} students loaded`);
    } catch { toast.error('Failed to load class'); }
  }, [date, cls, subjectId, periodNo]);

  const mark    = (idx, status) => setRecords(r => r.map((rec, i) => i === idx ? { ...rec, status } : rec));
  const markAll = (status) => setRecords(r => r.map(rec => ({ ...rec, status })));

  const handleSave = async () => {
    if (!records.length) return toast.error('Load a class first');
    if (!subjectId)      return toast.error('Select a subject to mark attendance');
    setSaving(true);
    try {
      await api.post('/attendance/mark', {
        date,
        subjectId,
        periodNo,
        records: records.map(r => ({ studentId: r.studentId, status: r.status })),
      });
      const present = records.filter(r => r.status === 'P').length;
      const absent  = records.filter(r => r.status === 'A').length;
      toast.success(`✅ Saved! ${present} present · ${absent} absent`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const selectedSubject = subjects.find(s => s._id === subjectId);
  const presentCount    = records.filter(r => r.status === 'P').length;
  const absentCount     = records.filter(r => r.status === 'A').length;
  const leaveCount      = records.filter(r => r.status === 'L').length;
  const onLeaveCount    = records.filter(r => r.onApprovedLeave).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Mark Attendance</h2>
          <p className="page-subtitle">Period-wise, subject-wise roll call</p>
        </div>
        {records.length > 0 && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Save size={14} /> Save Attendance</>}
          </button>
        )}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date}
              onChange={e => setDate(e.target.value)} max={today} />
          </div>

          {/* Class — free text with suggestions */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <input
              className="form-input"
              list="class-suggestions"
              value={cls}
              onChange={e => setCls(e.target.value)}
              placeholder="Type class e.g. ECE, ECE-B"
            />
            <datalist id="class-suggestions">
              {classes.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Subject */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Subject *
              {selectedSubject?.isLab && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: '0.65rem' }}>Lab (2×)</span>}
            </label>
            <select className="form-select" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">{subjects.length === 0 && cls ? 'No subjects — add in Subjects page' : 'Select subject...'}</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.code} — {s.name} {s.class ? `(${s.class})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Period No.</label>
            <select className="form-select" value={periodNo} onChange={e => setPeriodNo(Number(e.target.value))}>
              {Array.from({ length: maxPeriods }, (_, i) => (
                <option key={i + 1} value={i + 1}>Period {i + 1}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" style={{ height: 40 }} onClick={loadClass}>
            <BookOpen size={14} /> Load
          </button>
        </div>

        {/* Selected info chip */}
        {subjectId && cls && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">📅 {date}</span>
            <span className="badge badge-purple">🏫 {cls}</span>
            <span className="badge badge-teal"><BookOpen size={10} /> {selectedSubject?.code} — {selectedSubject?.name}</span>
            <span className="badge"><Clock size={10} /> Period {periodNo}</span>
          </div>
        )}
      </div>

      {/* ── Stats + Bulk Actions ─────────────────────────────────────────────── */}
      {records.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>✅ Present: {presentCount}</span>
            <span className="badge badge-red"   style={{ fontSize: '0.8rem', padding: '5px 12px' }}>❌ Absent: {absentCount}</span>
            <span className="badge badge-yellow" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>📋 Leave: {leaveCount}</span>
            {onLeaveCount > 0 && (
              <span className="badge badge-orange" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>🏥 On Approved Leave: {onLeaveCount}</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-success btn-sm" onClick={() => markAll('P')}>✅ All Present</button>
              <button className="btn btn-danger btn-sm"  onClick={() => markAll('A')}>❌ All Absent</button>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reg No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>Leave</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.studentId}
                      style={{
                        background: r.status === 'A' ? 'rgba(239,68,68,0.04)'
                          : r.status === 'P' ? 'rgba(16,185,129,0.04)'
                          : 'rgba(251,191,36,0.04)',
                      }}>
                      <td style={{ color: 'var(--text-dim)', width: 40 }}>{i + 1}</td>
                      <td>
                        <span className="badge badge-purple">{r.regNo}</span>
                        {r.onApprovedLeave && <span className="badge badge-orange" style={{ marginLeft: 4, fontSize: '0.65rem' }}>On Leave</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      {['P', 'A', 'L'].map(s => (
                        <td key={s} style={{ textAlign: 'center' }}>
                          <button
                            className={`attend-btn${r.status === s ? ' ' + s : ''}`}
                            onClick={() => mark(i, s)}
                          >
                            {s === 'P' ? '✓' : s === 'A' ? '✗' : 'L'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save button at bottom too */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '11px 28px' }}>
              {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <><Save size={14} /> Save Attendance</>}
            </button>
          </div>
        </>
      )}

      {records.length === 0 && cls && (
        <div className="empty-state card">
          <CheckCircle size={40} />
          <h3>Ready to mark attendance</h3>
          <p>Select a subject and period, then click <strong>Load</strong></p>
        </div>
      )}

      {!cls && (
        <div className="empty-state card">
          <BookOpen size={40} />
          <h3>Select a class to begin</h3>
          <p>Choose the class, subject, and period above</p>
        </div>
      )}
    </div>
  );
}
