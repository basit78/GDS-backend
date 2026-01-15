import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import flightRoutes from './routes/flight-routes.js';
import authRoutes from './routes/auth-routes.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://gds-frontend.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.options('*', cors());

// Session: store in MongoDB
app.use(session({
  secret: process.env.SESSION_SECRECT,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Auth routes
app.use('/api/auth', authRoutes);

app.use('/api/flights', flightRoutes);

app.get('/', (req, res) => {
  res.send('GDS Flight Booking API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});