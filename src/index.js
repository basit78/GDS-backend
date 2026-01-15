import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import flightRoutes from './routes/flight-routes.js';
import authRoutes from './routes/auth-routes.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

const app = express();
const PORT = process.env.PORT || 5000;

// -- Mongoose Connection Caching for Serverless --
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    if (!process.env.MONGODB_URI) {
      throw new Error("Please define the MONGODB_URI environment variable");
    }

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log('New MongoDB connection established');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}
// test
const allowedOrigins = [
  'http://localhost:3000',
  'https://gds-frontend.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.options('*', cors());

// Ensure DB is connected for every request
app.use(async (req, res, next) => {
  if (req.path === '/') return next(); // Skip DB for health check if desired, but keeping it simple
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Session: store in MongoDB
// Note: MongoStore creates its own connection if mongoUrl is provided. 
// Ideally reuse the connection but for now we keep it simple as it handles itself well.
app.use(session({
  secret: process.env.SESSION_SECRECT || 'default_secret', // Fallback to prevent crash if missing
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

// Start server if not running on Vercel
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

export default app;