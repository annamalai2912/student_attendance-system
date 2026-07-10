// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Users, ClipboardCheck, IndianRupee, Bell, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../lib/api';

const PIE_COLORS = ['#4f46e5', '#ef4444'];

function KpiCard({ icon: Icon, label, value, sub, colorClass }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${colorClass}`}><Icon size={20} /></div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem' }}>
      <strong style={{ color: 'var(--text-muted)' }}>{label}</strong>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginTop: 3 }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/admin'),
      api.get('/attendance/summary'),
    ]).then(([d, t]) => {
      setData(d.data);
      setTrend(t.data.map(r => ({
        date: r._id?.slice(5),
        present: r.present,
        absent: r.total - r.present,
      })));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const feeChartData = data ? [
    { name: 'Collected', value: data.totalPaid },
    { name: 'Pending',   value: data.totalDue },
  ] : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Dashboard</h2>
          <p className="page-subtitle">Overview of attendance and fee status</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard icon={Users}         label="Total Students"  value={data?.totalStudents ?? '—'}    sub={`${data?.totalActive ?? 0} active`}           colorClass="purple" />
        <KpiCard icon={ClipboardCheck} label="Avg Attendance" value={`${data?.avgAttendance ?? '—'}%`} sub="Across all students"                        colorClass="green" />
        <KpiCard icon={IndianRupee}   label="Fee Collected"   value={data?.totalPaid ? `₹${(data.totalPaid/1000).toFixed(0)}K` : '₹0'} sub={`${data?.feeCollectionRate ?? 0}% collected`} colorClass="blue" />
        <KpiCard icon={AlertTriangle} label="Fee Pending"     value={data?.totalDue  ? `₹${(data.totalDue/1000).toFixed(0)}K`  : '₹0'} sub="Outstanding balance"                  colorClass="yellow" />
        <KpiCard icon={Bell}          label="Alerts Sent"     value={data?.recentAlerts?.length ?? 0} sub="Recent 10"                                colorClass="red" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Attendance trend */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18 }}>📈 Attendance Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4,4,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee pie */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18 }}>💰 Fee Collection</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={feeChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {feeChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CUSTOM_TOOLTIP />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
            {feeChartData.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block' }} />
                {f.name}: ₹{(f.value/1000).toFixed(0)}K
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>🔔 Recent Alerts</h3>
        {data?.recentAlerts?.length ? data.recentAlerts.map(a => (
          <div key={a._id} className="alert-item">
            <span className="alert-icon">
              {a.type === 'ATTENDANCE_WARNING' ? '⚠️' : a.type === 'FEE_REMINDER' ? '💰' : '📋'}
            </span>
            <div style={{ flex: 1 }}>
              <div className="alert-title">
                {a.studentRef?.name} — {a.type.replace('_', ' ')}
                <span className={`badge badge-${a.language === 'ta' ? 'blue' : a.language === 'te' ? 'purple' : 'green'}`}
                  style={{ marginLeft: 8 }}>
                  {a.language?.toUpperCase()}
                </span>
              </div>
              <div className="alert-meta">{a.message} · {a.channels?.join(', ')}</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
              {new Date(a.sentAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <Bell size={32} /><h3>No recent alerts</h3>
          </div>
        )}
      </div>
    </div>
  );
}
