// frontend/src/pages/ParentPortal.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, IndianRupee, Bell } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { format } from 'date-fns';

export default function ParentPortal() {
  const { user } = useAuth();
  const studentId = user?.studentRef;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    api.get(`/dashboard/parent/${studentId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (!studentId) return (
    <div className="empty-state" style={{ paddingTop: 100 }}>
      <Bell size={48} />
      <h3>No student linked to your account</h3>
      <p>Please contact the school admin to link your child's profile.</p>
    </div>
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>;

  const pct = parseFloat(data?.attendance?.percentage || 0);
  const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const radialData = [{ name: 'Attendance', value: pct, fill: color }];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Parent Portal</h2>
          <p className="page-subtitle">Monitoring: <strong>{data?.student?.name}</strong> · {data?.student?.class}</p>
        </div>
      </div>

      {/* Attendance card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)' }}>Attendance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'var(--bg-input)' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color, marginTop: -12 }}>{pct}%</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            {data?.attendance?.present} present / {data?.attendance?.total} total days
          </div>
          {pct < 75 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: '0.78rem', color: 'var(--danger)' }}>
              ⚠️ Below required 75% threshold
            </div>
          )}
        </div>

        {/* Pending fees */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)' }}>
            <IndianRupee size={14} style={{ display: 'inline', marginRight: 5 }} />Pending Fees
          </h3>
          {data?.pendingFees?.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <ClipboardCheck size={32} />
              <h3>All fees paid! 🎉</h3>
            </div>
          ) : (
            data?.pendingFees?.map(f => {
              const daysLeft = Math.ceil((new Date(f.dueDate) - new Date()) / 86400000);
              return (
                <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Semester {f.semester} · {f.academicYear}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      Due: {format(new Date(f.dueDate), 'dd MMM yyyy')}
                      {daysLeft >= 0
                        ? <span style={{ color: daysLeft <= 5 ? 'var(--danger)' : 'var(--text-dim)', marginLeft: 6 }}>({daysLeft} days left)</span>
                        : <span style={{ color: 'var(--danger)', marginLeft: 6 }}>Overdue</span>}
                    </div>
                    <div className="progress-bar" style={{ marginTop: 6, width: 120 }}>
                      <div className="progress-fill yellow" style={{ width: `${(f.paidAmount/f.totalAmount*100).toFixed(0)}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)' }}>₹{f.balance?.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>of ₹{f.totalAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent alerts for parent */}
      <div className="card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)' }}>
          <Bell size={14} style={{ display: 'inline', marginRight: 5 }} />Recent Notifications
        </h3>
        {data?.recentAlerts?.length === 0 && (
          <div className="empty-state" style={{ padding: '20px 0' }}><h3>No notifications yet</h3></div>
        )}
        {data?.recentAlerts?.map(a => (
          <div key={a._id} className="alert-item">
            <span className="alert-icon">{a.type === 'ATTENDANCE_WARNING' ? '⚠️' : a.type === 'FEE_REMINDER' ? '💰' : '📋'}</span>
            <div style={{ flex: 1 }}>
              <div className="alert-title">{a.type.replace(/_/g, ' ')}</div>
              <div className="alert-meta">{a.message}</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {format(new Date(a.sentAt), 'dd MMM, hh:mm a')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
