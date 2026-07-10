// frontend/src/pages/AttendancePage.jsx  (Admin view — view all students' stats)
import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import api from '../lib/api';

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [stats, setStats]       = useState({});   // { studentId: { percentage, present, total } }
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/students?isActive=true').then(async ({ data }) => {
      setStudents(data);
      // fetch stats for all students concurrently (batch of 20)
      const chunks = [];
      for (let i = 0; i < data.length; i += 20) chunks.push(data.slice(i, i + 20));
      const allStats = {};
      for (const chunk of chunks) {
        await Promise.all(chunk.map(async s => {
          try {
            const { data: d } = await api.get(`/attendance/stats/${s._id}`);
            allStats[s._id] = d;
          } catch { allStats[s._id] = { total: 0, present: 0, percentage: '0.0' }; }
        }));
      }
      setStats(allStats);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNo.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    const rows = [['Reg No', 'Name', 'Class', 'Batch', 'Present', 'Total', 'Percentage', 'Status']];
    filtered.forEach(s => {
      const st = stats[s._id] || {};
      const pct = parseFloat(st.percentage || 0);
      rows.push([s.regNo, s.name, s.class, s.batch, st.present || 0, st.total || 0, `${st.percentage || 0}%`, pct < 75 ? 'Below Threshold' : 'OK']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'attendance_report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Attendance Report</h2>
          <p className="page-subtitle">All students' attendance summary</p>
        </div>
        <button className="btn btn-ghost" onClick={downloadCSV}><Download size={14} /> Export CSV</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="search-box">
          <Search size={15} color="#94a3b8" />
          <input placeholder="Search student, reg no, class..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reg No</th><th>Name</th><th>Class</th><th>Present</th>
                <th>Total Days</th><th>Attendance %</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50 }}>
                  <div className="spinner" style={{ margin: 'auto', width: 30, height: 30, borderTopColor: 'var(--primary)' }} />
                </td></tr>
              )}
              {!loading && filtered.map(s => {
                const st  = stats[s._id] || {};
                const pct = parseFloat(st.percentage || 0);
                const clr = pct < 75 ? 'var(--danger)' : pct < 85 ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={s._id}>
                    <td><span className="badge badge-blue">{s.regNo}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.batch}</div>
                    </td>
                    <td>{s.class}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{st.present ?? '—'}</td>
                    <td style={{ color: '#64748b' }}>{st.total ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar" style={{ width: 90 }}>
                          <div className={`progress-fill ${pct < 75 ? 'red' : pct < 85 ? 'yellow' : 'green'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, color: clr }}>{st.percentage ?? '0.0'}%</span>
                      </div>
                    </td>
                    <td>
                      {pct < 75
                        ? <span className="badge badge-red">⚠️ Below 75%</span>
                        : <span className="badge badge-green">✅ Good</span>}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><h3>No students found</h3></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
