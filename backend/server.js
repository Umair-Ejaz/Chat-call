
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import socketHandler from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Allow frontend requests from the same Wi-Fi network.
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.18.39:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as Postman.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked this origin: ${origin}`)
    );
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health-check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API server is running',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

socketHandler(io);

// Start server only after database connection succeeds.
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Local API: http://localhost:${PORT}`);
      console.log(`Network API: http://192.168.18.39:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }
};

startServer();