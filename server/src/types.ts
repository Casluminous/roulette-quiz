export type CardType = 'king' | 'queen' | 'ace' | 'joker' | 'devil';

export type TableType = 'king' | 'queen' | 'ace';

export interface Card {
  id: string;
  type: CardType;
  isDevil?: boolean;
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  hand: Card[];
  isAlive: boolean;
  left?: boolean;
  hasCards: boolean;
}

export interface Room {
  id: string;
  players: Player[];
  state: 'waiting' | 'playing';
  createdAt: number;
}

export interface Gun {
  chambers: boolean[];
  currentPosition: number;
  bulletsFired: number;
}

export interface GameState {
  id: string;
  roomId: string;
  phase: string;
  players: Player[];
  currentTurn: number;
  tableType: TableType;
  deck: Card[];
  tablePile: Card[];
  round: number;
  gun: Gun;
  devilGun: Gun;
  devilTriggered: boolean;
  callingPlayer?: number;
  lastPlayCount?: number;
  devilPlayerIndex?: number;
  callTimeout?: NodeJS.Timeout;
}
