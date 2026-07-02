import { v4 as uuidv4 } from 'uuid';
import { Room, Player } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();

  private validatePlayerName(name: string): string {
    let sanitized = (name || '').trim();
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    sanitized = sanitized.replace(/[^a-zA-Z0-9 ]/g, '');
    sanitized = sanitized.substring(0, 12);
    if (!sanitized) {
      return 'GUEST' + Math.floor(1000 + Math.random() * 9000);
    }
    return sanitized;
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  cleanupStaleRooms(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 10 * 60 * 1000;
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.state === 'waiting' && (now - room.createdAt) > STALE_THRESHOLD) {
        this.rooms.delete(roomId);
        for (const player of room.players) {
          this.playerRooms.delete(player.id);
        }
      }
    }
  }

  createRoom(socketId: string, playerName: string): Room {
    const sanitized = this.validatePlayerName(playerName);
    let roomId: string;
    let attempts = 0;
    do {
      roomId = uuidv4().substring(0, 6).toUpperCase();
      attempts++;
    } while (this.hasRoom(roomId) && attempts < 10);
    const room: Room = {
      id: roomId,
      players: [{
        id: socketId,
        name: sanitized,
        isReady: false,
        hand: [],
        isAlive: true,
        shotsFired: 0,
        hasCards: true,
      }],
      state: 'waiting',
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);

    return room;
  }

  joinRoom(roomId: string, socketId: string, playerName: string): { success: boolean; error?: string; players?: Player[] } {
    const sanitized = this.validatePlayerName(playerName);
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= 4) {
      return { success: false, error: 'Room is full' };
    }

    if (room.state !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    if (room.players.some(p => p.id === socketId)) {
      return { success: false, error: 'Already in room' };
    }

    const existingByName = room.players.findIndex(p => p.name === sanitized);
    if (existingByName !== -1) {
      const stale = room.players[existingByName];
      room.players.splice(existingByName, 1);
      this.playerRooms.delete(stale.id);
    }

    room.players.push({
      id: socketId,
      name: sanitized,
      isReady: false,
      hand: [],
      isAlive: true,
      shotsFired: 0,
      hasCards: true,
    });

    this.playerRooms.set(socketId, roomId);

    return {
      success: true,
      players: room.players,
    };
  }

  toggleReady(roomId: string, socketId: string): { success: boolean; error?: string; players?: Player[]; allReady?: boolean } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.find(p => p.id === socketId);
    if (!player) {
      return { success: false, error: 'Player not in room' };
    }

    player.isReady = !player.isReady;

    const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);

    return {
      success: true,
      players: room.players,
      allReady,
    };
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socketId);
    this.playerRooms.delete(socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  handleDisconnect(socketId: string): void {
    const roomId = this.playerRooms.get(socketId);
    if (roomId) {
      this.leaveRoom(roomId, socketId);
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPlayerRoom(socketId: string): Room | undefined {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getWaitingRooms(): { id: string; playerCount: number; maxPlayers: number; createdAt: number }[] {
    const result: { id: string; playerCount: number; maxPlayers: number; createdAt: number }[] = [];
    for (const [id, room] of this.rooms.entries()) {
      if (room.state === 'waiting' && room.players.length < 4) {
        result.push({
          id,
          playerCount: room.players.length,
          maxPlayers: 4,
          createdAt: room.createdAt,
        });
      }
    }
    return result;
  }
}
