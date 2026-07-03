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
  isReady?: boolean;
  cardsCount?: number;
  isAlive?: boolean;
}

export interface TriggerResult {
  alive: boolean;
  playerId?: string;
  playerName?: string;
  bulletCount: number;
}

export interface WinnerInfo {
  winner: string;
  isLocalWinner: boolean;
}

export interface CallResult {
  caller: string;
  wasLying: boolean;
  revealedCards: Card[];
  previousPlayer?: string;
  liarName?: string;
  hasDevilCard?: boolean;
}

export interface DevilReveal {
  ownerName: string;
  affectedPlayers: string[];
}

export interface GunState {
  bulletsFired: number;
  currentPosition: number;
  bulletCount: number;
}

export interface SlashEffect {
  players: { id: string; name: string; alive: boolean }[];
  bulletCount: number;
  isAccept: boolean;
  excludedPlayerId?: string | null;
  excludedPlayerName?: string | null;
}

export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'calling' | 'revealing' | 'trigger' | 'game_over';
export type Screen = 'menu' | 'lobby' | 'game' | 'gameover';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
