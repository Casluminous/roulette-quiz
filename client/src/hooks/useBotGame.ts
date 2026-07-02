import { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Player, Card, TriggerResult, WinnerInfo, TableType, CallResult } from '../types';
import { Sounds } from '../audio/Sounds';

const BOT_NAMES = ['CIPHER', 'PHANTOM', 'ROGUE', 'GHOST', 'SHADOW', 'NEXUS', 'VIPER', 'STORM'];

export interface BotState {
  id: string;
  name: string;
  hand: Card[];
  isAlive: boolean;
  cardsCount: number;
}

type CardType = 'king' | 'queen' | 'ace' | 'joker';

interface BotGameCallbacks {
  setScreen: (screen: 'menu' | 'lobby' | 'game' | 'gameover') => void;
  setRound: (v: number | ((prev: number) => number)) => void;
  setPhase: (v: GamePhase) => void;
  setCurrentTurnId: (v: string) => void;
  setHandCards: (v: Card[] | ((prev: Card[]) => Card[])) => void;
  setTriggerResult: (v: TriggerResult | null) => void;
  setPlayers: (v: Player[] | ((prev: Player[]) => Player[])) => void;
  setWinnerInfo: (v: WinnerInfo | null) => void;
  setTableType: (v: TableType) => void;
  setPlayedCount: (v: number) => void;
  setPlayedBy: (v: string) => void;
  setCallResult: (v: CallResult | null) => void;
  setCanCall: (v: boolean) => void;
}

const DECK_CONFIG: Record<CardType, number> = {
  king: 6,
  queen: 6,
  ace: 6,
  joker: 2,
};

function createRealDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const [type, count] of Object.entries(DECK_CONFIG)) {
    for (let i = 0; i < count; i++) {
      deck.push({ id: `deck-${id++}`, type: type as CardType });
    }
  }
  return deck;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealFromDeck(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  return { cards: deck.slice(0, count), remaining: deck.slice(count) };
}

function createBotGun() {
  const chambers = Array(6).fill(false);
  chambers[Math.floor(Math.random() * 6)] = true;
  return { chambers, currentPosition: 0, bulletsFired: 0 };
}

function generateTableType(): TableType {
  const types: TableType[] = ['king', 'queen', 'ace'];
  return types[Math.floor(Math.random() * types.length)];
}

function botPlayCards(hand: Card[], tableType: TableType): Card[] {
  const matching = hand.filter(c => c.type === tableType || c.type === 'joker');
  const bluffing = hand.filter(c => c.type !== tableType && c.type !== 'joker');
  const isBluff = Math.random() < 0.5;
  const pool = (isBluff ? bluffing : matching).length > 0
    ? (isBluff ? bluffing : matching)
    : (isBluff ? matching : bluffing);
  if (pool.length === 0) return [hand[0]];
  const count = Math.min(1 + Math.floor(Math.random() * Math.min(3, pool.length)), pool.length);
  return pool.slice(0, count);
}

function botShouldCallLiar(): boolean {
  return Math.random() < 0.3;
}

export function useBotGame(playerName: string, callbacks: BotGameCallbacks) {
  const [botMode, setBotMode] = useState(false);
  const [botCount, setBotCount] = useState(1);
  const [bots, setBots] = useState<BotState[]>([]);
  const [botHudMessage, setBotHudMessage] = useState<{ text: string; color: string } | null>(null);
  const [botGun, setBotGun] = useState(createBotGun);
  const [isSpectating, setIsSpectating] = useState(false);
  const [currentTableType, setCurrentTableType] = useState<TableType>('king');

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulletsFiredCountRef = useRef<number>(0);
  const botGunRef = useRef(botGun);
  const gamePhaseRef = useRef<GamePhase>('waiting');
  const currentTurnRef = useRef('');
  const botsRef = useRef<BotState[]>(bots);
  const handCardsRef = useRef<Card[]>([]);
  const playersRef = useRef<Player[]>([]);
  const callbacksRef = useRef(callbacks);
  const tableTypeRef = useRef<TableType>(currentTableType);
  const lastPlayedCardsRef = useRef<Card[]>([]);
  const lastPlayedByRef = useRef<string>('');
  const lastDeclarationRef = useRef<TableType>('king');

  useEffect(() => { botGunRef.current = botGun; }, [botGun]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);
  useEffect(() => { tableTypeRef.current = currentTableType; }, [currentTableType]);

  const clearAllTimers = useCallback(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  const showHUDAlert = useCallback((text: string, color: string, duration: number) => {
    setBotHudMessage({ text, color });
    setTimeout(() => setBotHudMessage(null), duration);
  }, []);

  const getAliveOrder = useCallback((): string[] => {
    const allIds = ['local-player', ...botsRef.current.map(b => b.id)];
    return allIds.filter(id => {
      if (id === 'local-player') {
        return playersRef.current.find(p => p.id === 'local-player')?.isAlive;
      }
      return botsRef.current.find(b => b.id === id)?.isAlive;
    });
  }, []);

  const getNextAliveWithCards = useCallback((afterId: string): string => {
    const alive = getAliveOrder();
    if (alive.length === 0) return 'local-player';
    const startIdx = alive.indexOf(afterId);
    const searchFrom = startIdx === -1 ? 0 : startIdx;

    for (let i = 1; i <= alive.length; i++) {
      const idx = (searchFrom + i) % alive.length;
      const id = alive[idx];
      if (id === 'local-player') {
        if (handCardsRef.current.length > 0) return id;
      } else {
        const bot = botsRef.current.find(b => b.id === id);
        if (bot && bot.isAlive && bot.hand.length > 0) return id;
      }
    }
    if (alive.length > 0) return alive[0];
    return 'local-player';
  }, [getAliveOrder]);

  const checkBotGameOver = useCallback(() => {
    const cb = callbacksRef.current;
    const aliveBots = botsRef.current.filter(b => b.isAlive);
    const playerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
    if (aliveBots.length === 0 || (!playerAlive && aliveBots.length <= 1)) {
      const winnerName = aliveBots.length > 0 ? aliveBots[0].name : playerName;
      cb.setWinnerInfo({ winner: winnerName, isLocalWinner: aliveBots.length === 0 });
      cb.setPhase('game_over');
      if (aliveBots.length === 0) Sounds.victory();
      setTimeout(() => cb.setScreen('gameover'), 3000);
      return true;
    }
    return false;
  }, [playerName]);

  const dealNewRound = useCallback(() => {
    const cb = callbacksRef.current;
    const newTableType = generateTableType();
    setCurrentTableType(newTableType);
    cb.setTableType(newTableType);
    cb.setRound(prev => prev + 1);
    bulletsFiredCountRef.current = 0;
    setBotGun(createBotGun());

    const aliveBotIds = botsRef.current.filter(b => b.isAlive).map(b => b.id);
    const playerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
    const totalAlive = aliveBotIds.length + (playerAlive ? 1 : 0);
    const totalNeeded = totalAlive * 5;
    let deck = shuffleArray(createRealDeck());

    if (deck.length < totalNeeded) {
      deck = shuffleArray(createRealDeck());
    }

    const newBots = botsRef.current.map(b => {
      if (!b.isAlive) return { ...b, hand: [], cardsCount: 0 };
      const { cards, remaining } = dealFromDeck(deck, 5);
      deck = remaining;
      return { ...b, hand: cards, cardsCount: 5 };
    });
    botsRef.current = newBots;
    setBots(newBots);

    cb.setPlayers(prev => prev.map(p => p.isAlive ? { ...p, cardsCount: 5 } : { ...p, cardsCount: 0 }));

    if (playerAlive) {
      const { cards: newHand } = dealFromDeck(deck, 5);
      handCardsRef.current = newHand;
      cb.setHandCards(newHand);
    }

    Sounds.newRound();
  }, []);

  const executeTriggerForPlayer = useCallback((targetId: string, callback: () => void) => {
    clearAllTimers();
    const cb = callbacksRef.current;
    const gun = botGunRef.current;
    const bulletInChamber = gun.chambers[gun.currentPosition];
    const alive = !bulletInChamber;

    let targetName = playerName;
    if (targetId !== 'local-player') {
      targetName = botsRef.current.find(b => b.id === targetId)?.name || 'BOT';
    }

    bulletsFiredCountRef.current++;
    const bulletCount = 6 - bulletsFiredCountRef.current;

    setBotGun(prev => ({
      ...prev,
      bulletsFired: bulletsFiredCountRef.current,
      currentPosition: (prev.currentPosition + 1) % 6,
    }));

    Sounds.gunClick();

    setTimeout(() => {
      if (alive) {
        Sounds.gunSurvive();
        showHUDAlert(`${targetName} // COCK SURVIVED`, 'text-amber-400', 2000);
      } else {
        Sounds.gunFire();
        showHUDAlert(`${targetName} // TERMINATED`, 'text-red-500', 3000);
      }

      cb.setPlayers(prev => prev.map(p => {
        if (p.id === targetId) {
          return {
            ...p,
            isAlive: alive ? p.isAlive : false,
            cardsCount: alive ? p.cardsCount : 0,
          };
        }
        return p;
      }));

      if (!alive && targetId !== 'local-player') {
        botsRef.current = botsRef.current.map(b => b.id === targetId ? { ...b, isAlive: false, hand: [], cardsCount: 0 } : b);
      }

      cb.setTriggerResult({
        alive,
        playerId: targetId,
        playerName: targetName,
        bulletCount,
      });
      cb.setPhase('trigger');

      setTimeout(() => {
        cb.setTriggerResult(null);
        if (!alive) {
          if (targetId === 'local-player') {
            cb.setPlayers(prev => prev.map(p => p.id === 'local-player' ? { ...p, isAlive: false } : p));
            handCardsRef.current = [];
            cb.setHandCards([]);
          } else {
            const updated = botsRef.current.map(b => b.id === targetId ? { ...b, isAlive: false, hand: [], cardsCount: 0 } : b);
            botsRef.current = updated;
            setBots(updated);
            cb.setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, isAlive: false, cardsCount: 0 } : p));
          }
        }
        callback();
      }, 3000);
    }, 1200);
  }, [playerName, showHUDAlert, clearAllTimers]);

  const processCallResult = useCallback((callerId: string, previousPlayerId: string) => {
    const cb = callbacksRef.current;
    const playedCards = lastPlayedCardsRef.current;
    const declaration = lastDeclarationRef.current;
    const wasLying = playedCards.some(c => c.type !== declaration && c.type !== 'joker');

    const callerName = callerId === 'local-player' ? playerName : botsRef.current.find(b => b.id === callerId)?.name || 'BOT';
    const previousName = previousPlayerId === 'local-player' ? playerName : botsRef.current.find(b => b.id === previousPlayerId)?.name || 'BOT';

    cb.setCallResult({
      caller: callerName,
      wasLying,
      revealedCards: playedCards,
      previousPlayer: previousName,
    });
    cb.setPhase('revealing');

    const targetId = wasLying ? previousPlayerId : callerId;

    setTimeout(() => {
      cb.setCallResult(null);
      cb.setPhase('playing');

      executeTriggerForPlayer(targetId, () => {
        if (checkBotGameOver()) return;

        dealNewRound();
        const nextTurn = wasLying ? getNextAliveWithCards(targetId) : getNextAliveWithCards(callerId);
        cb.setCurrentTurnId(nextTurn);
        cb.setPhase('playing');
        if (nextTurn !== 'local-player') {
          setTimeout(() => botPlayTurn(nextTurn), 1500);
        }
      });
    }, 3000);
  }, [playerName, getNextAliveWithCards, dealNewRound, executeTriggerForPlayer, checkBotGameOver]);

  const botPlayTurn = useCallback((botId: string) => {
    clearAllTimers();
    const cb = callbacksRef.current;
    const bot = botsRef.current.find(b => b.id === botId);
    if (!bot || bot.hand.length === 0) return;

    const tableType = tableTypeRef.current;
    const playedCards = botPlayCards(bot.hand, tableType);
    const remainingHand = bot.hand.filter(c => !playedCards.includes(c));
    const isBluff = playedCards.some(c => c.type !== tableType && c.type !== 'joker');

    lastPlayedCardsRef.current = playedCards;
    lastPlayedByRef.current = botId;
    lastDeclarationRef.current = tableType;

    setBots(prev => {
      const updated = prev.map(b =>
        b.id === botId
          ? { ...b, hand: remainingHand, cardsCount: remainingHand.length }
          : b
      );
      botsRef.current = updated;
      return updated;
    });

    cb.setPlayers(prev => prev.map(p =>
      p.id === botId ? { ...p, cardsCount: remainingHand.length } : p
    ));

    cb.setPlayedCount(playedCards.length);
    cb.setPlayedBy(bot.name);
    cb.setPhase('calling');

    const bluffTag = isBluff ? ' [BLUFF]' : '';
    showHUDAlert(`${bot.name} played ${playedCards.length} card${playedCards.length > 1 ? 's' : ''}${bluffTag}`, 'text-cyan-theme', 2000);

    const nextDecider = getNextAliveWithCards(botId);

    if (nextDecider === 'local-player') {
      cb.setCurrentTurnId('local-player');
      cb.setCanCall(true);
      cb.setPhase('calling');

      const acceptTimer = setTimeout(() => {
        if (gamePhaseRef.current === 'calling') {
          const playerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
          if (playerAlive) {
            handleBotAcceptPlay();
          }
        }
      }, 15000);
      botTimerRef.current = acceptTimer;
    } else {
      setTimeout(() => {
        if (botShouldCallLiar()) {
          processCallResult(nextDecider, botId);
        } else {
          cb.setPlayedCount(0);
          cb.setPlayedBy('');
          cb.setCurrentTurnId(nextDecider);
          cb.setPhase('playing');
          setTimeout(() => botPlayTurn(nextDecider), 1500);
        }
      }, 2000 + Math.random() * 2000);
    }
  }, [clearAllTimers, getNextAliveWithCards, processCallResult, showHUDAlert]);

  const handleBotPlayCards = useCallback((cardIds: string[], declaration: TableType) => {
    clearAllTimers();
    const cb = callbacksRef.current;

    const playedCards = handCardsRef.current.filter(c => cardIds.includes(c.id));
    const newHand = handCardsRef.current.filter(c => !cardIds.includes(c.id));

    lastPlayedCardsRef.current = playedCards;
    lastPlayedByRef.current = 'local-player';
    lastDeclarationRef.current = declaration;

    cb.setHandCards(newHand);
    cb.setPlayers(prev => prev.map(p =>
      p.id === 'local-player' ? { ...p, cardsCount: newHand.length } : p
    ));

    cb.setPlayedCount(cardIds.length);
    cb.setPlayedBy(playerName);
    cb.setTableType(declaration);
    cb.setPhase('calling');
    cb.setCanCall(false);

    showHUDAlert(`You played ${cardIds.length} card${cardIds.length > 1 ? 's' : ''}`, 'text-cyan-theme', 2000);

    const nextDecider = getNextAliveWithCards('local-player');
    if (nextDecider === 'local-player') {
      cb.setCurrentTurnId('local-player');
      cb.setPhase('playing');
    } else {
      cb.setCurrentTurnId(nextDecider);
      setTimeout(() => {
        if (botShouldCallLiar()) {
          processCallResult(nextDecider, 'local-player');
        } else {
          cb.setPlayedCount(0);
          cb.setPlayedBy('');
          cb.setCurrentTurnId(nextDecider);
          cb.setPhase('playing');
          setTimeout(() => botPlayTurn(nextDecider), 1500);
        }
      }, 2000 + Math.random() * 2000);
    }
  }, [playerName, clearAllTimers, getNextAliveWithCards, processCallResult, botPlayTurn, showHUDAlert]);

  const handleBotCallLiar = useCallback(() => {
    clearAllTimers();
    processCallResult('local-player', lastPlayedByRef.current);
  }, [clearAllTimers, processCallResult]);

  const handleBotAcceptPlay = useCallback(() => {
    clearAllTimers();
    const cb = callbacksRef.current;

    cb.setPlayedCount(0);
    cb.setPlayedBy('');

    const currentTurn = currentTurnRef.current;
    cb.setCurrentTurnId(currentTurn);
    cb.setPhase('playing');

    if (currentTurn !== 'local-player') {
      setTimeout(() => botPlayTurn(currentTurn), 1500);
    }
  }, [clearAllTimers, botPlayTurn]);

  const startBotGame = useCallback((count: number) => {
    setBotMode(true);
    setBotCount(count);

    const botPlayers: BotState[] = [];
    for (let i = 0; i < count; i++) {
      botPlayers.push({
        id: `bot-${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        hand: [],
        isAlive: true,
        cardsCount: 5,
      });
    }
    setBots(botPlayers);

    const allPlayers: Player[] = [
      { id: 'local-player', name: playerName, cardsCount: 5, isAlive: true },
      ...botPlayers.map(b => ({ id: b.id, name: b.name, cardsCount: 5, isAlive: true })),
    ];
    callbacks.setPlayers(allPlayers);
    callbacks.setScreen('game');
    callbacks.setRound(1);
    bulletsFiredCountRef.current = 0;
    setBotGun(createBotGun());
    callbacks.setPhase('waiting');

    setTimeout(() => {
      const newTableType = generateTableType();
      setCurrentTableType(newTableType);
      callbacks.setTableType(newTableType);

      const totalCards = (count + 1) * 5;
      let deck = shuffleArray(createRealDeck());

      if (deck.length < totalCards) {
        deck = shuffleArray(createRealDeck());
      }

      const newBots: BotState[] = [];
      for (let i = 0; i < count; i++) {
        const { cards, remaining } = dealFromDeck(deck, 5);
        deck = remaining;
        newBots.push({
          id: `bot-${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          hand: cards,
          isAlive: true,
          cardsCount: 5,
        });
      }
      setBots(newBots);
      botsRef.current = newBots;

      const { cards: localHand } = dealFromDeck(deck, 5);
      handCardsRef.current = localHand;
      callbacks.setHandCards(localHand);
      callbacks.setPhase('playing');
      callbacks.setCurrentTurnId('local-player');
      Sounds.newRound();
    }, 1000);
  }, [playerName, callbacks]);

  const handleBotDisconnect = useCallback(() => {
    clearAllTimers();
    setBotMode(false);
    setBots([]);
    callbacks.setScreen('menu');
    callbacks.setPhase('waiting');
    callbacks.setHandCards([]);
    callbacks.setTriggerResult(null);
    callbacks.setRound(1);
    callbacks.setCallResult(null);
  }, [callbacks, clearAllTimers]);

  const syncHandCards = useCallback((cards: Card[]) => {
    handCardsRef.current = cards;
  }, []);

  const syncPlayers = useCallback((players: Player[]) => {
    playersRef.current = players;
  }, []);

  const syncPhase = useCallback((phase: GamePhase) => {
    gamePhaseRef.current = phase;
  }, []);

  const syncCurrentTurn = useCallback((turnId: string) => {
    currentTurnRef.current = turnId;
  }, []);

  return {
    botMode,
    botCount,
    bots,
    botHudMessage,
    botGun,
    isSpectating,
    startBotGame,
    handleBotDisconnect,
    handleBotPlayCards,
    handleBotCallLiar,
    handleBotAcceptPlay,
    syncHandCards,
    syncPlayers,
    syncPhase,
    syncCurrentTurn,
  };
}
