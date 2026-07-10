// backend/server.js
require('express-async-errors');
require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const studentRoutes      = require('./routes/students');
const attendanceRoutes   = require('./routes/attendance');
const feeRoutes          = require('./routes/fees');
const alertRoutes        = require('./routes/alerts');
const dashboardRoutes    = require('./routes/dashboard');
const departmentRoutes   = require('./routes/departments');
const academicYearRoutes = require('./routes/academicYears');
const calendarRoutes     = require('./routes/calendar');
const subjectRoutes      = require('./routes/subjects');
const leaveRoutes        = require('./routes/leaves');
const reportRoutes       = require('./routes/reports');
const { startJobs }      = require('./jobs/alertJob');
const { initWhatsApp }   = require('./services/whatsappService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/students',       studentRoutes);
app.use('/api/attendance',     attendanceRoutes);
app.use('/api/fees',           feeRoutes);
app.use('/api/alerts',         alertRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/departments',    departmentRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/calendar',       calendarRoutes);
app.use('/api/subjects',       subjectRoutes);
app.use('/api/leaves',         leaveRoutes);
app.use('/api/reports',        reportRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── DB + Start ───────────────────────────────────────────────────────────────
// family:4 forces IPv4 DNS — fixes querySrv ECONNREFUSED on Windows Node.js
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      startJobs();
      initWhatsApp();
    });
  })
  .catch((err) => { console.error('❌ MongoDB connection failed:', err.message); process.exit(1); });
