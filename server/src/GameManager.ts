import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { DeckManager } from './DeckManager';
import { RoomManager } from './RoomManager';
import { GameState, Gun, Card, TableType } from './types';

export class GameManager {
  private roomManager: RoomManager;
  private io: Server;
  private deckManager: DeckManager;
  private games: Map<string, GameState> = new Map();

  constructor(roomManager: RoomManager, io: Server) {
    this.roomManager = roomManager;
    this.io = io;
    this.deckManager = new DeckManager();
  }

  startGame(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const gameState: GameState = {
      id: uuidv4(),
      roomId,
      phase: 'dealing',
      players: room.players.map(p => ({
        ...p,
        hand: [],
        isAlive: true,
        hasCards: true,
      })),
      currentTurn: 0,
      tableType: 'king',
      deck: [],
      tablePile: [],
      round: 1,
      gun: this.createGun(),
      devilGun: this.createDevilGun(),
      devilTriggered: false,
    };

    this.games.set(roomId, gameState);
    room.state = 'playing';

    this.io.to(roomId).emit('game:start', {
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cardsCount: 5,
        isAlive: true,
      })),
      round: gameState.round,
    });

    setTimeout(() => {
      this.dealCards(roomId);
    }, 1000);
  }

  private createGun(): Gun {
    const chambers = Array(6).fill(false);
    chambers[Math.floor(Math.random() * 6)] = true;
    return {
      chambers,
      currentPosition: 0,
      bulletsFired: 0,
    };
  }

  private createDevilGun(): Gun {
    const chambers = Array(4).fill(false);
    chambers[Math.floor(Math.random() * 4)] = true;
    return {
      chambers,
      currentPosition: 0,
      bulletsFired: 0,
    };
  }

  private dealCards(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const alivePlayers = game.players.filter(p => p.isAlive);
    const { deck, tableType } = this.deckManager.createRoundDeck(alivePlayers.length);
    game.deck = deck;
    game.tableType = tableType;
    game.tablePile = [];

    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.tableType = tableType;
      room.round = game.round;
    }

    alivePlayers.forEach(player => {
      const { cards, remaining } = this.deckManager.dealCards(game.deck, 5);
      player.hand = cards;
      player.hasCards = true;
      game.deck = remaining;
    });

    game.players.forEach(player => {
      if (player.isAlive) {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
          socket.emit('game:deal', {
            cards: player.hand,
            tableType: game.tableType,
            gun: {
              bulletsFired: game.gun.bulletsFired,
              currentPosition: game.gun.currentPosition,
              bulletCount: 6 - game.gun.bulletsFired,
            },
          });
        }
      }
    });

    this.io.to(roomId).emit('game:cardsUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        cardsCount: p.isAlive ? p.hand.length : 0,
        isAlive: p.isAlive,
      })),
      tableType: game.tableType,
    });

    game.phase = 'playing';
    const currentPlayer = game.players[game.currentTurn];
    this.io.to(roomId).emit('game:turn', { playerId: currentPlayer.id });
  }

  handlePlayCards(roomId: string, socketId: string, cardIds: string[], declaration: TableType): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'playing') return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.currentTurn) return;

    const player = game.players[playerIndex];
    if (!player.isAlive || player.hand.length === 0) return;

    const validCards = cardIds.filter(id => player.hand.some(c => c.id === id));
    if (validCards.length === 0 || validCards.length > 3) return;

    const playedCards: Card[] = [];
    validCards.forEach(cardId => {
      const card = player.hand.find(c => c.id === cardId);
      if (card) {
        playedCards.push(card);
        player.hand = player.hand.filter(c => c.id !== cardId);
      }
    });

    game.tablePile = playedCards;
    game.lastPlayCount = playedCards.length;

    if (player.hand.length === 0) {
      player.hasCards = false;
    }

    this.io.to(roomId).emit('game:cardsPlayed', {
      playerName: player.name,
      count: playedCards.length,
      declaration,
    });

    this.io.to(roomId).emit('game:cardsUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        cardsCount: p.isAlive ? p.hand.length : 0,
        isAlive: p.isAlive,
      })),
      tableType: game.tableType,
    });

    game.phase = 'calling';

    const nextPlayerIndex = this.getNextAlivePlayerWithCards(game, game.currentTurn);
    if (nextPlayerIndex === -1) {
      this.handleAllCardsPlayed(roomId);
      return;
    }

    game.callingPlayer = nextPlayerIndex;
    const nextPlayer = game.players[nextPlayerIndex];

    this.io.to(roomId).emit('game:turn', {
      playerId: nextPlayer.id,
      phase: 'calling',
      canCall: true,
    });

    game.callTimeout = setTimeout(() => {
      this.handleCallTimeout(roomId);
    }, 15000);
  }

  private handleCallTimeout(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'calling') return;

    this.handleAcceptPlay(roomId, game.players[game.callingPlayer!].id);
  }

  handleAcceptPlay(roomId: string, socketId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'calling') return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.callingPlayer) return;

    if (game.callTimeout) {
      clearTimeout(game.callTimeout);
      game.callTimeout = undefined;
    }

    const hasDevilCard = game.tablePile.some(card => card.type === 'devil');

    if (hasDevilCard) {
      this.io.to(roomId).emit('game:accepted', {
        playerName: game.players[playerIndex].name,
      });
      setTimeout(() => {
        this.handleDevilAcceptTrigger(roomId);
      }, 2000);
      return;
    }

    game.tablePile = [];
    game.phase = 'playing';
    game.currentTurn = playerIndex;

    this.io.to(roomId).emit('game:accepted', {
      playerName: game.players[playerIndex].name,
    });

    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.hand.length === 0) {
      this.handleAllCardsPlayed(roomId);
      return;
    }

    this.io.to(roomId).emit('game:turn', { playerId: currentPlayer.id });
  }

  handleCallLiar(roomId: string, socketId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'calling') return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.callingPlayer) return;

    if (game.callTimeout) {
      clearTimeout(game.callTimeout);
      game.callTimeout = undefined;
    }

    const previousPlayerIndex = this.getPreviousAlivePlayer(game, playerIndex);
    const previousPlayer = game.players[previousPlayerIndex];
    const playedCards = game.tablePile;

    const isLying = playedCards.some(card => card.type !== game.tableType && card.type !== 'joker' && card.type !== 'devil');
    const hasDevilCard = playedCards.some(card => card.type === 'devil');

    game.phase = 'revealing';

    this.io.to(roomId).emit('game:callResult', {
      caller: game.players[playerIndex].name,
      wasLying: isLying,
      revealedCards: playedCards,
      previousPlayer: previousPlayer.name,
      hasDevilCard,
    });

    if (hasDevilCard) {
      setTimeout(() => {
        this.handleDevilCallTrigger(roomId, playerIndex);
      }, 3000);
      return;
    }

    if (isLying) {
      game.devilPlayerIndex = previousPlayerIndex;
    } else {
      game.devilPlayerIndex = playerIndex;
    }

    setTimeout(() => {
      this.pullTrigger(roomId);
    }, 3000);
  }

  private handleDevilCard(roomId: string, ownerIndex: number, callerIndex: number): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const owner = game.players[ownerIndex];
    const affectedPlayers: string[] = [];

    game.players.forEach((player, index) => {
      if (index !== ownerIndex && player.isAlive) {
        affectedPlayers.push(player.id);
      }
    });

    this.io.to(roomId).emit('game:devilReveal', {
      ownerName: owner.name,
      affectedPlayers: affectedPlayers.map(id => game.players.find(p => p.id === id)?.name || ''),
    });

    game.devilPlayerIndex = ownerIndex;

    setTimeout(() => {
      this.pullTriggerForMultiple(roomId, ownerIndex, affectedPlayers);
    }, 3000);
  }

  private handleDevilCallTrigger(roomId: string, callerIndex: number): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const caller = game.players[callerIndex];
    const devilGun = game.devilGun;
    const bullet = devilGun.chambers[devilGun.currentPosition];
    devilGun.bulletsFired++;
    devilGun.currentPosition = (devilGun.currentPosition + 1) % 4;

    this.io.to(roomId).emit('game:devilShot', {
      targetName: caller.name,
      targetId: caller.id,
      alive: !bullet,
      bulletCount: 4 - devilGun.bulletsFired,
    });

    if (bullet) {
      caller.isAlive = false;
      caller.hasCards = false;
    }

    setTimeout(() => {
      this.afterTrigger(roomId, bullet);
    }, 3000);
  }

  private handleDevilAcceptTrigger(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const devilGun = game.devilGun;
    const affectedPlayers: { id: string; name: string; alive: boolean }[] = [];

    game.players.forEach((player) => {
      if (player.isAlive) {
        const bullet = devilGun.chambers[devilGun.currentPosition];
        devilGun.bulletsFired++;
        devilGun.currentPosition = (devilGun.currentPosition + 1) % 4;

        if (bullet) {
          player.isAlive = false;
          player.hasCards = false;
        }

        affectedPlayers.push({
          id: player.id,
          name: player.name,
          alive: !bullet,
        });
      }
    });

    this.io.to(roomId).emit('game:devilAcceptShot', {
      players: affectedPlayers,
      bulletCount: 4 - devilGun.bulletsFired,
    });

    const anyDied = affectedPlayers.some(p => !p.alive);
    setTimeout(() => {
      this.afterTrigger(roomId, anyDied);
    }, 3000);
  }

  private pullTriggerForMultiple(roomId: string, firstPlayerIndex: number, otherPlayerIds: string[]): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const allToTrigger = [firstPlayerIndex, ...otherPlayerIds.map(id => game.players.findIndex(p => p.id === id))];

    this.processTriggerSequence(roomId, allToTrigger, 0);
  }

  private processTriggerSequence(roomId: string, playerIndices: number[], currentIndex: number): void {
    const game = this.games.get(roomId);
    if (!game) return;

    if (currentIndex >= playerIndices.length) {
      const anyDied = game.players.some(p => !p.isAlive);
      this.afterTrigger(roomId, anyDied);
      return;
    }

    const playerIndex = playerIndices[currentIndex];
    const player = game.players[playerIndex];

    if (!player.isAlive) {
      this.processTriggerSequence(roomId, playerIndices, currentIndex + 1);
      return;
    }

    game.devilPlayerIndex = playerIndex;
    this.pullTriggerSingle(roomId, () => {
      this.processTriggerSequence(roomId, playerIndices, currentIndex + 1);
    });
  }

  private pullTrigger(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.devilPlayerIndex === undefined) return;

    const targetPlayer = game.players[game.devilPlayerIndex];

    this.pullTriggerSingle(roomId, () => {
      this.afterTrigger(roomId, !targetPlayer.isAlive);
    });
  }

  private pullTriggerSingle(roomId: string, callback: () => void): void {
    const game = this.games.get(roomId);
    if (!game || game.devilPlayerIndex === undefined) return;

    const gun = game.gun;
    const bullet = gun.chambers[gun.currentPosition];
    gun.bulletsFired++;
    gun.currentPosition = (gun.currentPosition + 1) % 6;

    const targetPlayer = game.players[game.devilPlayerIndex];

    if (bullet) {
      targetPlayer.isAlive = false;
      targetPlayer.hasCards = false;

      this.io.to(roomId).emit('game:trigger', {
        alive: false,
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        bulletCount: 6 - gun.bulletsFired,
      });
    } else {
      this.io.to(roomId).emit('game:trigger', {
        alive: true,
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        bulletCount: 6 - gun.bulletsFired,
      });
    }

    setTimeout(callback, 3000);
  }

  private afterTrigger(roomId: string, playerDied: boolean): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const alivePlayers = game.players.filter(p => p.isAlive);

    if (alivePlayers.length <= 1) {
      this.io.to(roomId).emit('game:over', {
        winner: alivePlayers[0]?.name || 'No one',
        winnerId: alivePlayers[0]?.id || '',
      });
      this.games.delete(roomId);
      const room = this.roomManager.getRoom(roomId);
      if (room) {
        room.state = 'waiting';
        room.tableType = undefined;
        room.round = undefined;
      }
      this.roomManager.cleanupChatHistory(roomId);
      return;
    }

    game.round++;

    if (playerDied) {
      game.gun = this.createGun();
    }

    const nextTurnIndex = this.getNextAlivePlayerWithCards(game, game.currentTurn);
    game.currentTurn = nextTurnIndex !== -1 ? nextTurnIndex : game.players.findIndex(p => p.isAlive);
    game.devilPlayerIndex = undefined;
    game.tablePile = [];

    this.io.to(roomId).emit('game:newRound', {
      round: game.round,
      gun: {
        bulletsFired: game.gun.bulletsFired,
        currentPosition: game.gun.currentPosition,
        bulletCount: 6 - game.gun.bulletsFired,
      },
    });

    this.dealCards(roomId);
  }

  private handleAllCardsPlayed(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const playersWithCards = game.players.filter(p => p.isAlive && p.hasCards);

    if (playersWithCards.length <= 1) {
      this.io.to(roomId).emit('game:roundEnd', {
        reason: 'all_cards_played',
      });
      this.afterTrigger(roomId, false);
      return;
    }

    this.dealCards(roomId);
  }

  private getNextAlivePlayerWithCards(game: GameState, fromIndex: number): number {
    let next = (fromIndex + 1) % game.players.length;
    let checked = 0;
    while (checked < game.players.length) {
      if (game.players[next].isAlive && game.players[next].hasCards) {
        return next;
      }
      next = (next + 1) % game.players.length;
      checked++;
    }
    return -1;
  }

  private getPreviousAlivePlayer(game: GameState, fromIndex: number): number {
    let prev = (fromIndex - 1 + game.players.length) % game.players.length;
    let checked = 0;
    while (checked < game.players.length) {
      if (game.players[prev].isAlive) {
        return prev;
      }
      prev = (prev - 1 + game.players.length) % game.players.length;
      checked++;
    }
    return fromIndex;
  }

  handleLeaveAfterDeath(roomId: string, socketId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    if (player.isAlive) return;

    player.left = true;

    this.io.to(roomId).emit('game:playerLeftAfterDeath', {
      playerId: socketId,
      playerName: player.name,
    });
  }

  handleDisconnect(socketId: string): void {
    for (const [roomId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        if (game.callTimeout) {
          clearTimeout(game.callTimeout);
          game.callTimeout = undefined;
        }

        game.players[playerIndex].isAlive = false;
        game.players[playerIndex].hasCards = false;

        this.io.to(roomId).emit('game:playerLeft', {
          playerId: socketId,
        });

        const alivePlayers = game.players.filter(p => p.isAlive);
        if (alivePlayers.length <= 1) {
          this.io.to(roomId).emit('game:over', {
            winner: alivePlayers[0]?.name || 'No one',
            winnerId: alivePlayers[0]?.id || '',
            reason: 'disconnect',
          });
          this.games.delete(roomId);
        }
        break;
      }
    }
  }
}
