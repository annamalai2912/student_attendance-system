// frontend/src/pages/TeacherDashboard.jsx
import { useState, useEffect } from 'react';
import { Users, ClipboardCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #dbe8fd', borderRadius: 8,
      padding: '10px 14px', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(30,58,138,0.1)'
    }}>
      <strong style={{ color: '#64748b' }}>{label}</strong>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginTop: 3 }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  );
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [rows, setRows]       = useState([]);
  const [cls, setCls]         = useState(user?.assignedClass || '');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/students/meta/classes').then(r => setClasses(r.data)).catch(console.error);
    if (cls) load(cls);
  }, []);

  const load = async (c) => {
    setLoading(true);
    try {
      const { data } = await api.get('/dashboard/teacher', { params: { class: c } });
      setRows(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const threshold = 75;
  const belowCount   = rows.filter(r => parseFloat(r.percentage) < threshold).length;
  const presentAvg   = rows.length
    ? (rows.reduce((s, r) => s + parseFloat(r.percentage), 0) / rows.length).toFixed(1)
    : '—';

  const chartData = rows
    .slice()
    .sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
    .slice(0, 15)
    .map(r => ({ name: r.student?.name?.split(' ')[0], pct: parseFloat(r.percentage) }));

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Teacher Dashboard</h2>
          <p className="page-subtitle">Attendance overview for your class</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select className="form-select" value={cls}
              onChange={e => { setCls(e.target.value); load(e.target.value); }}>
              <option value="">Select class...</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        {[
          { label: 'Students',      value: rows.length,   colorClass: 'blue',   icon: Users },
          { label: 'Avg Attendance',value: `${presentAvg}%`, colorClass: 'purple', icon: TrendingUp },
          { label: 'Below 75%',     value: belowCount,    colorClass: 'red',    icon: AlertTriangle },
          { label: 'Classes Marked',value: rows.length > 0 ? rows[0]?.total || '—' : '—', colorClass: 'green', icon: ClipboardCheck },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className={`kpi-icon ${k.colorClass}`}><k.icon size={20} /></div>
            <div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)' }}>
            📊 Student Attendance % (Bottom 15)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="pct" name="Attendance" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct < 75 ? '#ef4444' : entry.pct < 85 ? '#f59e0b' : '#1d4ed8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.74rem', color: '#64748b' }}>
            <span><span style={{ color: '#1d4ed8', fontWeight: 700 }}>■</span> ≥85% Good</span>
            <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>■</span> 75–84% Caution</span>
            <span><span style={{ color: '#ef4444', fontWeight: 700 }}>■</span> &lt;75% Warning</span>
          </div>
        </div>
      )}

      {/* Student table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-muted)' }}>Student Attendance List</h3>
          {belowCount > 0 && (
            <span className="badge badge-red">⚠️ {belowCount} below threshold</span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Reg No</th><th>Name</th><th>Present</th><th>Total</th><th>Attendance %</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ margin: 'auto', width: 28, height: 28, borderTopColor: 'var(--primary)' }} />
                </td></tr>
              )}
              {!loading && rows.map((r, i) => {
                const pct = parseFloat(r.percentage);
                const color = pct < 75 ? 'var(--danger)' : pct < 85 ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={r.student?._id}>
                    <td style={{ color: '#94a3b8', width: 40 }}>{i + 1}</td>
                    <td><span className="badge badge-blue">{r.student?.regNo}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.student?.name}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{r.present}</td>
                    <td style={{ color: '#64748b' }}>{r.total}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className={`progress-fill ${pct < 75 ? 'red' : pct < 85 ? 'yellow' : 'green'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, color, fontSize: '0.88rem' }}>{r.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {r.belowThreshold
                        ? <span className="badge badge-red">⚠️ Low</span>
                        : <span className="badge badge-green">✅ OK</span>}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state"><h3>Select a class to view</h3></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
