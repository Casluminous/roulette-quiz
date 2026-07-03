import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

class SocketClient {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private callbacks: Record<string, EventCallback[]> = {};
  public playerName: string = 'GUEST';

  connect(url: string): Promise<Socket> {
    if (this.socket && this.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      let settled = false;

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('Connected to server');
        if (!settled) {
          settled = true;
          resolve(this.socket!);
        }
        this.emit('_reconnect', undefined);
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('Disconnected from server:', reason);
        this.emit('_disconnect', reason);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error.message);
        if (!settled) {
          settled = true;
          reject(error);
        }
        this.emit('_connect_error', error);
      });

      this.socket.io.on('reconnect_attempt', (attempt: number) => {
        console.log(`Reconnection attempt ${attempt}`);
        this.emit('_reconnect_attempt', attempt);
      });

      this.socket.io.on('reconnect', (attempt: number) => {
        console.log(`Reconnected after ${attempt} attempts`);
        this.emit('_reconnect', attempt);
      });

      this.socket.io.on('reconnect_failed', () => {
        console.error('All reconnection attempts failed');
        this.emit('_reconnect_failed', undefined);
      });

      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('room:created', (data: any) => this.emit('room:created', data));
    this.socket.on('room:joined', (data: any) => this.emit('room:joined', data));
    this.socket.on('room:players', (data: any) => this.emit('room:players', data));
    this.socket.on('room:left', () => this.emit('room:left'));

    this.socket.on('game:start', (data: any) => this.emit('game:start', data));
    this.socket.on('game:deal', (data: any) => this.emit('game:deal', data));
    this.socket.on('game:cardsPlayed', (data: any) => this.emit('game:cardsPlayed', data));
    this.socket.on('game:callResult', (data: any) => this.emit('game:callResult', data));
    this.socket.on('game:devilReveal', (data: any) => this.emit('game:devilReveal', data));
    this.socket.on('game:devilShot', (data: any) => this.emit('game:devilShot', data));
    this.socket.on('game:devilAcceptShot', (data: any) => this.emit('game:devilAcceptShot', data));
    this.socket.on('game:trigger', (data: any) => this.emit('game:trigger', data));
    this.socket.on('game:newRound', (data: any) => this.emit('game:newRound', data));
    this.socket.on('game:over', (data: any) => this.emit('game:over', data));
    this.socket.on('game:playerLeft', (data: any) => this.emit('game:playerLeft', data));
    this.socket.on('game:playerLeftAfterDeath', (data: any) => this.emit('game:playerLeftAfterDeath', data));
    this.socket.on('game:cardsUpdate', (data: any) => this.emit('game:cardsUpdate', data));
    this.socket.on('game:turn', (data: any) => this.emit('game:turn', data));
    this.socket.on('game:accepted', (data: any) => this.emit('game:accepted', data));
    this.socket.on('game:roundEnd', (data: any) => this.emit('game:roundEnd', data));

    this.socket.on('error', (data: any) => this.emit('error', data));

    this.socket.on('chat:message', (data: any) => this.emit('chat:message', data));
    this.socket.on('chat:history', (data: any) => this.emit('chat:history', data));
  }

  on(event: string, callback: EventCallback): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  clearListeners(event?: string): void {
    if (event) {
      this.callbacks[event] = [];
    } else {
      this.callbacks = {};
    }
  }

  private emit(event: string, data?: any): void {
    if (this.callbacks[event]) {
      const callbacks = [...this.callbacks[event]];
      callbacks.forEach(cb => cb(data));
    }
  }

  send(event: string, data?: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  createRoom(playerName: string): void {
    this.send('room:create', { playerName });
  }

  joinRoom(roomId: string, playerName: string): void {
    this.send('room:join', { roomId, playerName });
  }

  toggleReady(roomId: string): void {
    this.send('room:ready', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.send('room:leave', { roomId });
  }

  playCards(roomId: string, cardIds: string[], declaration: string): void {
    this.send('game:playCards', { roomId, cardIds, declaration });
  }

  callLiar(roomId: string): void {
    this.send('game:callLiar', { roomId });
  }

  acceptPlay(roomId: string): void {
    this.send('game:acceptPlay', { roomId });
  }

  leaveAfterDeath(roomId: string): void {
    this.send('game:leaveAfterDeath', { roomId });
  }

  sendChat(roomId: string, message: string): void {
    this.send('chat:message', { roomId, message });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

export const socketClient = new SocketClient();
