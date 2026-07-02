import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { GameManager } from './GameManager';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

if (process.env.RENDER_EXTERNAL_URL) {
  ALLOWED_ORIGINS.push(process.env.RENDER_EXTERNAL_URL);
}

const io = new Server(server, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (origin.startsWith('file://')) return callback(null, true);
      if (isProduction) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const gameManager = new GameManager(roomManager, io);

const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(socketId);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(socketId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  limit.count++;
  return true;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.static('public'));

if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

app.get('/lan-servers', (_req, res) => {
  res.json({ servers: [] });
});

setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);

setInterval(() => {
  const now = Date.now();
  for (const [socketId, limit] of rateLimits.entries()) {
    if (now > limit.resetTime) {
      rateLimits.delete(socketId);
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.onAny((event: string, ...args: unknown[]) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
  });

  socket.on('room:create', (data: { playerName: string }) => {
    const { playerName } = data;
    const room = roomManager.createRoom(socket.id, playerName);
    socket.join(room.id);
    socket.emit('room:created', { roomId: room.id, playerId: socket.id });
    console.log(`Room created: ${room.id}`);
  });

  socket.on('room:join', (data: { roomId: string; playerName: string }) => {
    const { roomId, playerName } = data;
    const result = roomManager.joinRoom(roomId, socket.id, playerName);

    if (result.success) {
      socket.join(roomId);
      socket.emit('room:joined', { roomId, playerId: socket.id });
      const room = roomManager.getRoom(roomId);
      io.to(roomId).emit('room:players', { players: result.players });
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('room:ready', (data: { roomId: string }) => {
    const { roomId } = data;
    const result = roomManager.toggleReady(roomId, socket.id);

    if (result.success) {
      const room = roomManager.getRoom(roomId);
      io.to(roomId).emit('room:players', { players: result.players });

      if (result.allReady && result.players && result.players.length >= 2) {
        gameManager.startGame(roomId);
      }
    }
  });

  socket.on('room:leave', (data: { roomId: string }) => {
    const { roomId } = data;
    roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.emit('room:left');
    const updatedRoom = roomManager.getRoom(roomId);
    if (updatedRoom) {
      io.to(roomId).emit('room:players', { players: updatedRoom.players });
    }
  });

  socket.on('game:playCards', (data: { roomId: string; cardIds: string[]; declaration: string }) => {
    const { roomId, cardIds, declaration } = data;
    gameManager.handlePlayCards(roomId, socket.id, cardIds, declaration as any);
  });

  socket.on('game:callLiar', (data: { roomId: string }) => {
    const { roomId } = data;
    gameManager.handleCallLiar(roomId, socket.id);
  });

  socket.on('game:acceptPlay', (data: { roomId: string }) => {
    const { roomId } = data;
    gameManager.handleAcceptPlay(roomId, socket.id);
  });

  socket.on('game:leaveAfterDeath', (data: { roomId: string }) => {
    const { roomId } = data;
    gameManager.handleLeaveAfterDeath(roomId, socket.id);
    socket.leave(roomId);
    socket.emit('room:left');
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
    gameManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LAN: http://localhost:${PORT}`);
});
