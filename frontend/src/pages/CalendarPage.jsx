// frontend/src/pages/CalendarPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Check, CalendarDays } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  WORKING: '#16a34a', HOLIDAY: '#dc2626', EXAM: '#d97706', EVENT: '#7c3aed', HALFDAY: '#0891b2'
};
const TYPES = ['HOLIDAY','EXAM','EVENT','WORKING','HALFDAY'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CalendarPage() {
  const [events, setEvents]   = useState([]);
  const [years, setYears]     = useState([]);
  const [yearId, setYearId]   = useState('');
  const [month, setMonth]     = useState(new Date().getMonth() + 1);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ date: '', type: 'HOLIDAY', title: '', description: '', academicYear: '' });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      const params = { month, year };
      if (yearId) params.yearId = yearId;
      const res = await api.get('/calendar', { params });
      setEvents(res.data);
    } catch { toast.error('Failed to load calendar'); }
  }, [yearId, month, year]);

  useEffect(() => {
    api.get('/academic-years').then(r => {
      setYears(r.data);
      const active = r.data.find(y => y.isActive);
      if (active) setYearId(active._id);
    });
  }, []);

  useEffect(() => { if (yearId) load(); }, [load, yearId]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/calendar', { ...form, academicYear: yearId });
      toast.success('Event added!'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/calendar/${id}`);
    toast.success('Deleted'); load();
  };

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const eventMap    = {};
  events.forEach(e => {
    const d = new Date(e.date).getDate();
    if (!eventMap[d]) eventMap[d] = [];
    eventMap[d].push(e);
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Academic Calendar</h2>
          <p className="page-subtitle">Manage holidays, exam days, and events</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ date: `${year}-${String(month).padStart(2,'0')}-01`, type: 'HOLIDAY', title: '', description: '' }); setModal(true); }}>
          <Plus size={14}/> Add Event
        </button>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ minWidth: 180, margin: 0 }} value={yearId} onChange={e => setYearId(e.target.value)}>
          <option value="">Select Academic Year</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
        </select>
        <select className="form-select" style={{ minWidth: 120, margin: 0 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <input type="number" className="form-input" style={{ width: 90 }} value={year}
          onChange={e => setYear(Number(e.target.value))} />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          {Object.entries(TYPE_COLORS).map(([t, c]) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }}/>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = eventMap[day] || [];
            const isSunday = new Date(year, month - 1, day).getDay() === 0;
            return (
              <div key={day} style={{ minHeight: 64, background: isSunday ? '#fef2f2' : 'var(--bg-input)', borderRadius: 6, padding: '4px 6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: isSunday ? '#dc2626' : 'var(--text)', marginBottom: 2 }}>{day}</div>
                {dayEvents.map(ev => (
                  <div key={ev._id} style={{ background: TYPE_COLORS[ev.type] + '22', border: `1px solid ${TYPE_COLORS[ev.type]}44`, borderRadius: 3, padding: '1px 4px', fontSize: '0.67rem', color: TYPE_COLORS[ev.type], fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.6 }} onClick={() => del(ev._id)}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      {events.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
            Events this month ({events.length})
          </p>
          {events.map(ev => (
            <div key={ev._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[ev.type], flexShrink: 0 }}/>
              <span style={{ fontWeight: 600, minWidth: 100, fontSize: '0.85rem' }}>{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{ev.title}</span>
              <span className={`badge badge-${ev.type === 'HOLIDAY' ? 'red' : ev.type === 'EXAM' ? 'orange' : 'blue'}`}>{ev.type}</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => del(ev._id)}><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">📅 Add Calendar Event</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(false)}><X size={14}/></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={form.date} required
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Type *</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={form.title} required placeholder="Pongal, Internal Exam 1..."
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Description</label>
                <input className="form-input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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
