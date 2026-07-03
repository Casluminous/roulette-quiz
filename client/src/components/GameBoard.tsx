import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Revolver } from './Revolver';
import { Check, X, ArrowLeft } from '@phosphor-icons/react';
import { GamePhase, Player, Card, TriggerResult, TableType, CallResult, DevilReveal, GunState } from '../types';
import { Sounds } from '../audio/Sounds';

interface GameBoardProps {
  round: number;
  phase: GamePhase;
  players: Player[];
  localId: string;
  currentTurnId: string;
  handCards: Card[];
  tableType: TableType;
  playedCount: number;
  playedBy: string;
  callResult: CallResult | null;
  devilReveal: DevilReveal | null;
  triggerResult: TriggerResult | null;
  gunState: GunState;
  canCall: boolean;
  roomId: string;
  onLeaveAfterDeath: () => void;
  onPlayCards?: (cardIds: string[], declaration: TableType) => void;
  onCallLiar?: () => void;
  onAcceptPlay?: () => void;
  botHudMessage?: { text: string; color: string } | null;
  isBotSpectating?: boolean;
}

interface HudMessage {
  text: string;
  color: string;
}

interface OpponentPos {
  className: string;
  angle: number;
}

const getOpponentPosition = (index: number, total: number): OpponentPos => {
  const positions1 = [
    { className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20", angle: -90 }
  ];
  const positions2 = [
    { className: "absolute left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20", angle: 180 },
    { className: "absolute right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20", angle: 0 }
  ];
  const positions3 = [
    { className: "absolute left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20", angle: 180 },
    { className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20", angle: -90 },
    { className: "absolute right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20", angle: 0 }
  ];

  if (total === 1) return positions1[0];
  if (total === 2) return positions2[index] || positions2[0];
  return positions3[index] || positions3[0];
};

const getCardTypeStyle = (type: CardType): { color: string; label: string; icon: string } => {
  switch (type) {
    case 'king':
      return { color: '#f97316', label: 'KING', icon: '♚' };
    case 'queen':
      return { color: '#a855f7', label: 'QUEEN', icon: '♛' };
    case 'ace':
      return { color: '#ef4444', label: 'ACE', icon: '♠' };
    case 'joker':
      return { color: '#3b82f6', label: 'JOKER', icon: '★' };
    case 'devil':
      return { color: '#dc2626', label: 'DEVIL', icon: '🗡' };
    default:
      return { color: 'var(--text-theme)', label: '??', icon: '?' };
  }
};

const CARD_INFO: Record<string, { title: string; subtitle: string; quote: string; flavor: string }> = {
  king: {
    title: 'THE KING',
    subtitle: 'SOVEREIGN OF CHAOS',
    quote: '"Every crown is forged in the blood of those who knelt before it."',
    flavor: 'Rulers born from ruin. Their reign ends where the barrel begins.',
  },
  queen: {
    title: 'THE QUEEN',
    subtitle: 'ARCHITECT OF RUIN',
    quote: '"She doesn\'t play the game — she reshapes it in her image."',
    flavor: 'Graceful as a loaded chamber. Beautiful until it isn\'t.',
  },
  ace: {
    title: 'THE ACE',
    subtitle: 'FIRST bullet, LAST breath',
    quote: '"In this house, an ace means you\'re one pull away from silence."',
    flavor: 'The sharp end of probability. Hold it wrong and you\'re done.',
  },
  joker: {
    title: 'THE JOKER',
    subtitle: 'WILD CARD PROTOCOL',
    quote: '"Chaos doesn\'t pick sides — it just watches you burn."',
    flavor: 'Unpredictable. Untamable. The only card that answers to no one.',
  },
  devil: {
    title: 'THE DEVIL',
    subtitle: 'FORBIDDEN CURRENCY',
    quote: '"Play the devil\'s card and the house always collects — in flesh."',
    flavor: 'A pact written in ink and gunpowder. Sign at your own peril.',
  },
};

type CardInfoKey = keyof typeof CARD_INFO;

type CardType = 'king' | 'queen' | 'ace' | 'joker' | 'devil';

export function GameBoard({
  round,
  phase,
  players,
  localId,
  currentTurnId,
  handCards,
  tableType,
  playedCount,
  playedBy,
  callResult,
  devilReveal,
  triggerResult,
  gunState,
  canCall,
  roomId,
  onLeaveAfterDeath,
  onPlayCards,
  onCallLiar,
  onAcceptPlay,
  botHudMessage,
  isBotSpectating
}: GameBoardProps) {

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [hudMessage, setHudMessage] = useState<HudMessage | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(-90);
  const [isGunInCenter, setIsGunInCenter] = useState<boolean>(false);
  const [gunOpacity, setGunOpacity] = useState<number>(1);

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevHandCardsLength = useRef<number>(0);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  const lastMouseMoveRef = useRef<number>(0);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetFireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevPhase = useRef<GamePhase>(phase);
  const prevTableType = useRef<TableType>(tableType);

  useEffect(() => {
    setIsSpinning(false);
    setIsFiring(false);
    setRotationAngle(-90);
    setIsGunInCenter(false);
    setGunOpacity(1);
    setIsDealing(false);
    setRevealedCards(new Set());
    setSelectedCards(new Set());
    prevHandCardsLength.current = 0;
    lastProcessedTriggerRef.current = null;
  }, [round]);

  useEffect(() => {
    if (handCards.length > 0 && handCards.length > prevHandCardsLength.current && phase === 'playing') {
      prevHandCardsLength.current = handCards.length;
      setIsDealing(true);
      setRevealedCards(new Set());
      setSelectedCards(new Set());

      let cancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];

      const dealSequence = async () => {
        for (let i = 0; i < handCards.length; i++) {
          await new Promise(resolve => {
            const t = setTimeout(resolve, 200);
            timers.push(t);
          });
          if (cancelled) return;
          Sounds.cardDeal();
          setRevealedCards(prev => new Set([...prev, handCards[i].id]));
        }
        await new Promise(resolve => {
          const t = setTimeout(resolve, 300);
          timers.push(t);
        });
        if (!cancelled) setIsDealing(false);
      };

      dealSequence();

      return () => {
        cancelled = true;
        timers.forEach(t => clearTimeout(t));
      };
    }
  }, [handCards, phase]);

  useEffect(() => {
    if (triggerResult) {
      const triggerKey = `${triggerResult.playerId}-${triggerResult.bulletCount}-${triggerResult.alive}`;
      if (lastProcessedTriggerRef.current === triggerKey) return;
      lastProcessedTriggerRef.current = triggerKey;

      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (resetFireTimerRef.current) clearTimeout(resetFireTimerRef.current);

      setIsGunInCenter(true);
      setGunOpacity(1);
      setIsFiring(false);
      setIsSpinning(false);

      const playerId = triggerResult.playerId;
      let targetAngle = -90;

      if (playerId) {
        if (playerId === localId) {
          targetAngle = 90;
        } else {
          const oppIndex = opponentPlayers.findIndex(p => p.id === playerId);
          if (oppIndex >= 0) {
            const oppPos = getOpponentPosition(oppIndex, opponentPlayers.length);
            targetAngle = oppPos.angle;
          }
        }
      }

      spinTimerRef.current = setTimeout(() => {
        setRotationAngle(targetAngle);
        setIsSpinning(true);
        Sounds.gunClick();

        spinTimerRef.current = setTimeout(() => {
          setIsSpinning(false);
          setIsFiring(true);

          if (triggerResult.alive) {
            Sounds.gunSurvive();
            showHUDAlert('CLICK // COCK SURVIVED', 'text-amber-theme', 2000);
          } else {
            Sounds.gunFire();
            showHUDAlert('BANG // PROTOCOL FAULT', 'text-red-theme', 3000);
          }

          resetFireTimerRef.current = setTimeout(() => {
            setIsFiring(false);
            setGunOpacity(0);

            resetFireTimerRef.current = setTimeout(() => {
              setRotationAngle(-90);
              setIsGunInCenter(false);

              resetFireTimerRef.current = setTimeout(() => {
                setGunOpacity(1);
              }, 400);
            }, 100);
          }, 1500);
        }, 800);
      }, 400);
    } else {
      lastProcessedTriggerRef.current = null;
    }

    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (resetFireTimerRef.current) clearTimeout(resetFireTimerRef.current);
    };
  }, [triggerResult, localId]);

  useEffect(() => {
    if (currentTurnId === localId && phase === 'playing' && localPlayer.isAlive) {
      showHUDAlert('// YOUR TURN', 'text-cyan-theme', 1000);
      Sounds.turnAlert();
    } else if (currentTurnId === localId && phase === 'calling' && localPlayer.isAlive) {
      showHUDAlert('// CALL OR ACCEPT', 'text-amber-theme', 1000);
    }
  }, [currentTurnId, phase]);

  useEffect(() => {
    if (prevTableType.current !== tableType && phase === 'playing') {
      const label = getTableLabel();
      showHUDAlert(`◆ ${label}`, 'text-cyan-theme', 1500);
      Sounds.turnAlert();
    }
    prevTableType.current = tableType;
  }, [tableType, phase]);

  const showHUDAlert = (text: string, textColor: string, duration: number) => {
    setHudMessage({ text, color: textColor });
    setTimeout(() => setHudMessage(null), duration);
  };

  const handleCardSelect = (card: Card) => {
    if (phase !== 'playing' || currentTurnId !== localId) return;

    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(card.id)) {
        newSet.delete(card.id);
      } else if (newSet.size < 3) {
        newSet.add(card.id);
      }
      return newSet;
    });
  };

  const handlePlayCards = () => {
    if (selectedCards.size === 0 || !onPlayCards) return;
    Sounds.cardSlam();
    onPlayCards(Array.from(selectedCards), tableType);
    setSelectedCards(new Set());
  };

  const handleCallLiarClick = () => {
    Sounds.liarCall();
    onCallLiar?.();
  };

  const handleAcceptClick = () => {
    Sounds.acceptPlay();
    onAcceptPlay?.();
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const now = performance.now();
    if (now - lastMouseMoveRef.current < 16) return;
    lastMouseMoveRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = ((e.clientX - centerX) / (rect.width / 2)) * 12;
    const y = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    setTilt({ x, y });
    setHoveredCardIndex(index);
  };

  const handleCardMouseLeave = () => {
    setHoveredCardIndex(null);
    setTilt({ x: 0, y: 0 });
  };

  const localPlayer = players.find(p => p.id === localId) || { name: 'YOU', isAlive: true, cardsCount: 0 };
  const opponentPlayers = players.filter(p => p.id !== localId);
  const isSpectating = !localPlayer.isAlive;
  const isMyTurn = currentTurnId === localId;

  const sortedHandCards = [...handCards].sort((a, b) => {
    const order = { king: 0, queen: 1, ace: 2, joker: 3, devil: 4 };
    return (order[a.type as keyof typeof order] ?? 5) - (order[b.type as keyof typeof order] ?? 5);
  });

  const getHUDPhaseLabel = () => {
    if (phase === 'waiting') return 'SYSTEM // INITIALIZING';
    if (phase === 'dealing') return 'SYSTEM // DEALING_CARDS';
    if (phase === 'playing') return 'PROTOCOL // PLAY_CARDS';
    if (phase === 'calling') return 'CHALLENGE // CALL_OR_ACCEPT';
    if (phase === 'revealing') return 'REVEAL // CHECKING_CARDS';
    if (phase === 'trigger') return 'HAZARD // PULL_TRIGGER';
    if (phase === 'game_over') return 'SYSTEM // CONFLICT_TERMINATED';
    return 'SYSTEM // INITIALIZED';
  };

  const getHUDPhaseColor = () => {
    if (phase === 'trigger') return 'text-red-theme';
    if (phase === 'calling') return 'text-amber-theme';
    if (phase === 'revealing') return 'text-purple-theme';
    return 'text-text-theme-secondary';
  };

  const getTableLabel = () => {
    switch (tableType) {
      case 'king': return "KING'S TABLE";
      case 'queen': return "QUEEN'S TABLE";
      case 'ace': return "ACE'S TABLE";
      default: return "TABLE";
    }
  };

  const isPlaying = phase === 'playing';
  const isCalling = phase === 'calling';
  const isRevealing = phase === 'revealing';

  return (
    <div className="w-full h-full flex flex-col items-center justify-between py-6 px-12 z-10 select-none relative">
      <div className="w-full flex items-center justify-between pb-4 border-b border-border-theme z-30">
        <span className="text-xs font-bold text-text-theme tracking-widest uppercase">
          ROUND // 0{round}
        </span>
        <span className="text-xs font-bold text-cyan-theme tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rotate-45 bg-cyan-theme animate-pulse"></span>
          {getTableLabel()}
        </span>
        <span className={`text-xs font-bold tracking-widest uppercase ${getHUDPhaseColor()}`}>
          {getHUDPhaseLabel()}
        </span>
      </div>

      {opponentPlayers.map((opponent, index) => {
        const cardCount = opponent.cardsCount || 0;
        const isCurrentTurn = currentTurnId === opponent.id;
        const pos = getOpponentPosition(index, opponentPlayers.length);

        return (
          <div key={opponent.id} className={pos.className}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-text-theme-secondary tracking-wider relative z-10">
                {opponent.name}
              </span>
              <div className="relative">
                <AnimatePresence>
                  {(isPlaying || isCalling) && isCurrentTurn && opponent.isAlive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-30"
                      style={{ right: '-28px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <motion.svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="text-amber-theme"
                        animate={{ x: [0, -4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <path d="M 18 10 L 4 10 M 10 4 L 2 10 L 10 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`w-16 h-16 rounded-none bg-surface-2 border flex items-center justify-center font-mono font-black text-base relative z-10 transition-all duration-300 ${
                  !opponent.isAlive
                    ? 'border-red-theme-border text-red-theme/30 opacity-40'
                    : isCurrentTurn
                      ? 'border-amber-theme text-text-theme'
                      : 'border-cyan-theme-muted text-text-theme-muted'
                }`}>
                  <span className="absolute top-0.5 left-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                  <span className="absolute top-0.5 right-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                  <span className="absolute bottom-0.5 left-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                  <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>

                  {opponent.name.substring(0, 2).toUpperCase()}

                  {opponent.isAlive ? (
                    <span className={`absolute -top-1 -right-1 w-2 h-2 rotate-45 border border-bg-body z-20 ${
                      isCurrentTurn ? 'bg-amber-theme animate-pulse' : 'bg-emerald-theme'
                    }`} />
                  ) : (
                    <div className="absolute inset-0 bg-red-theme-bg rounded-none flex items-center justify-center">
                      <X size={20} className="text-red-theme/60 stroke-[3px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {opponent.isAlive && cardCount > 0 && (
              <div className="flex justify-center items-center h-16 w-32 relative mt-0.5">
                {Array.from({ length: cardCount }).map((_, idx) => {
                  const total = cardCount;
                  const mid = (total - 1) / 2;
                  const dist = idx - mid;
                  const xOffset = dist * 20;
                  const arcY = Math.abs(dist) * 2;
                  const arcAngle = dist * 4;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: arcY, x: xOffset, rotate: arcAngle, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20, delay: idx * 0.04 }}
                      className="absolute w-9 h-14 rounded-none border border-cyan-theme-muted bg-surface-3 shadow-none overflow-hidden"
                      style={{ transformOrigin: 'center 120%', zIndex: idx }}
                    >
                      <div className="absolute inset-0.5 rounded-none bg-surface-2 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0.5 border border-dashed border-cyan-theme-light rounded-none"></div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-none rotate-45 border border-cyan-theme-muted bg-surface-3"></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <span className="text-[8px] font-mono text-text-theme-muted tracking-wider">
              {!opponent.isAlive
                ? '// TERMINATED'
                : isCalling && isCurrentTurn
                  ? '// DECIDING...'
                  : isPlaying && isCurrentTurn
                    ? '// PLAYING'
                    : `CARDS // [0${cardCount}]`
              }
            </span>
          </div>
        );
      })}

      {opponentPlayers.length === 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 p-6 border border-dashed border-border-theme rounded-2xl bg-input-theme z-20">
          <div className="w-12 h-12 rounded-xl bg-panel-solid/60 border border-border-theme flex items-center justify-center font-bold text-xs text-text-theme-dim animate-pulse">
            ?
          </div>
          <span className="text-[10px] font-extrabold text-text-theme-muted tracking-widest uppercase">
            WAITING FOR OPPONENTS //
          </span>
        </div>
      )}

      {/* Center Table */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[340px] rounded-none bg-surface-3/70 border border-cyan-theme-muted backdrop-blur-md flex items-center justify-center gap-16 px-12 z-10 overflow-visible">
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
            <circle cx="360" cy="170" r="140" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="4,6" />
            <circle cx="360" cy="170" r="80" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="2,4" />
            <circle cx="360" cy="170" r="30" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.5" />
            <line x1="360" y1="10" x2="360" y2="330" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1="180" y1="170" x2="540" y2="170" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="3,3" />
            <path d="M 20 20 L 40 20 M 20 20 L 20 40" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 700 20 L 680 20 M 700 20 L 700 40" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 20 320 L 40 320 M 20 320 L 20 300" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 700 320 L 680 320 M 700 320 L 700 300" stroke="var(--cyan-theme)" strokeWidth="1" />
            <text x="360" y="25" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="middle">-90° // APEX</text>
            <text x="360" y="325" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="middle">90° // BASE</text>
            <text x="195" y="173" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="start">180° // PORT</text>
            <text x="525" y="173" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="end">0° // STBD</text>
          </svg>
        </div>

        {/* Played Cards Pile */}
        <div className="flex flex-col items-center space-y-2 z-20">
          <div className="w-32 h-44 bg-card-theme/50 border border-cyan-theme-muted border-dashed rounded-none flex items-center justify-center relative">
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

            <AnimatePresence mode="wait">
              {playedCount > 0 ? (
                <motion.div
                  key={`played-${playedCount}`}
                  initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="w-32 h-44 border border-amber-theme-border rounded-none p-3 flex flex-col justify-between relative shadow-none overflow-hidden bg-card-theme text-amber-theme"
                >
                  <div className="flex justify-between items-center w-full border-b border-border-theme pb-1 text-[8px] font-mono tracking-wider opacity-60">
                    <span>{playedBy}</span>
                    <span className="font-extrabold text-amber-theme">{playedCount}x</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center py-1 overflow-y-auto pr-0.5">
                    <p className="text-[10px] font-extrabold leading-normal text-left tracking-wide uppercase font-mono">
                      CLAIMING {tableType.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex justify-between items-center w-full border-t border-border-theme pt-1 text-[8px] font-mono tracking-widest opacity-50">
                    <span className="uppercase">{getTableLabel()}</span>
                    <span>CARDS</span>
                  </div>
                </motion.div>
              ) : (
                <span className="text-[9px] font-extrabold text-text-theme-dim tracking-widest uppercase text-center font-mono">
                  AWAITING
                  <br />
                  PLAY //
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Revolver Widget */}
      <motion.div
        animate={{
          left: isGunInCenter ? "50%" : "calc(50% + 480px)",
          top: "48%",
          scale: isGunInCenter ? 1.5 : 1.25,
          opacity: gunOpacity
        }}
        transition={{ duration: gunOpacity === 0 ? 0.15 : 0.6, type: "spring", bounce: gunOpacity === 0 ? 0 : 0.2 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
      >
        <Revolver
          bulletsFired={gunState.bulletsFired}
          currentPosition={gunState.currentPosition}
          isSpinning={isSpinning}
          isFiring={isFiring}
          alive={triggerResult ? triggerResult.alive : true}
          rotationAngle={rotationAngle}
        />
        {/* Bullet odds display */}
        <div className="mt-2 text-center">
          <span className={`text-xs font-mono font-black tracking-wider ${
            gunState.bulletCount <= 2 ? 'text-red-theme' : gunState.bulletCount <= 3 ? 'text-amber-theme' : 'text-text-theme-secondary'
          }`}>
            {gunState.bulletCount}/6 ROUNDS
          </span>
        </div>
      </motion.div>

      {/* Hand Cards */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20 w-full max-w-3xl">
        <div className="flex justify-center items-center h-52 relative w-full" style={{ perspective: '1200px' }}>
          <AnimatePresence>
            {sortedHandCards.map((card, index) => {
              const total = handCards.length;
              const mid = (total - 1) / 2;
              const dist = index - mid;
              const isPlayable = (isPlaying || isCalling) && isMyTurn && localPlayer.isAlive;
              const isRevealed = !isDealing || revealedCards.has(card.id);
              const isHovered = hoveredCardIndex === index;
              const isNeighbor = hoveredCardIndex !== null && Math.abs(hoveredCardIndex - index) === 1;
              const isSelected = selectedCards.has(card.id);
              const cardStyle = getCardTypeStyle(card.type);

              const neighborOffset = hoveredCardIndex !== null
                ? (index < hoveredCardIndex ? -32 : index > hoveredCardIndex ? 32 : 0)
                : 0;
              const baseX = dist * 72 + neighborOffset;
              const baseY = Math.pow(Math.abs(dist), 1.5) * 3;
              const baseAngle = dist * 2;

              const hoverY = isHovered ? -15 : isSelected ? -10 : baseY;
              const hoverScale = isHovered ? 1.04 : isSelected ? 1.02 : isNeighbor ? 0.97 : 1;
              const hoverAngle = isHovered ? 0 : baseAngle;
              const hoverZ = index;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{
                    opacity: isPlayable ? 1 : 0.6,
                    x: baseX,
                    y: hoverY,
                    rotateY: isHovered ? tilt.x * 0.3 : 0,
                    rotateX: isHovered ? tilt.y * 0.3 : 0,
                    rotate: hoverAngle,
                    scale: hoverScale,
                  }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  onMouseMove={(e) => isPlayable && handleCardMouseMove(e, index)}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleCardSelect(card)}
                  className={`absolute w-48 h-72 border-2 rounded-lg p-4 flex flex-col justify-between select-none bg-card-theme ${
                    !isPlayable ? 'cursor-default' : 'cursor-pointer group'
                  }`}
                  style={{
                    transformOrigin: 'center 110%',
                    zIndex: hoverZ,
                    transformStyle: 'preserve-3d',
                    borderColor: (isHovered || isSelected) ? cardStyle.color : `${cardStyle.color}60`,
                    boxShadow: isSelected ? `0 0 15px ${cardStyle.color}60` : 'none',
                    margin: '0 4px',
                  }}
                >
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

                  {isRevealed ? (
                    <>
                      <div className="flex justify-between items-center w-full border-b border-border-theme pb-1.5 text-[9px] font-mono tracking-wider opacity-60">
                        <span>{card.id.split('-').pop()?.toUpperCase() || card.id.substring(0, 4).toUpperCase()}</span>
                        <span className="font-extrabold text-text-theme-muted">
                          {cardStyle.label}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center py-2 overflow-y-auto pr-0.5">
                        <div className="text-6xl text-text-theme">
                          {cardStyle.icon}
                        </div>
                      </div>
                      <div className="flex justify-between items-center w-full border-t border-border-theme pt-1.5 text-[9px] font-mono tracking-widest opacity-50">
                        <span className="uppercase">{card.type}</span>
                        {card.type === 'devil' && (
                          <span className="text-red-theme font-extrabold">DEVIL</span>
                        )}
                      </div>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"
                        >
                          {isSelected && <Check size={16} className="text-emerald-theme" />}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-1 rounded-none border border-cyan-theme-muted bg-surface-3 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-1 border border-dashed border-cyan-theme-light rounded-none"></div>
                      </div>
                      <div className="w-3 h-3 rounded-none rotate-45 border border-cyan-theme-muted bg-surface-3"></div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Card Info Panel - Left side */}
      <AnimatePresence>
        {hoveredCardIndex !== null && sortedHandCards[hoveredCardIndex] && (() => {
          const card = sortedHandCards[hoveredCardIndex];
          const style = getCardTypeStyle(card.type);
          const info = CARD_INFO[card.type as CardInfoKey];
          if (!info) return null;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute left-6 top-[38%] -translate-y-1/2 z-40 w-56 pointer-events-none"
            >
              <div className="bg-panel-solid/95 border border-border-theme p-4 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3 border-b border-border-theme pb-2">
                  <span className="text-2xl" style={{ color: style.color }}>{style.icon}</span>
                  <div>
                    <div className="text-xs font-black tracking-widest uppercase font-mono" style={{ color: style.color }}>
                      {info.title}
                    </div>
                    <div className="text-[8px] font-mono tracking-wider text-text-theme-dim uppercase">
                      {info.subtitle}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-mono italic text-text-theme-secondary leading-relaxed mb-2">
                  {info.quote}
                </p>
                <p className="text-[9px] font-mono text-text-theme-dim leading-relaxed">
                  {info.flavor}
                </p>
                <div className="mt-2 pt-2 border-t border-border-theme flex justify-between text-[8px] font-mono text-text-theme-dim">
                  <span>TYPE // {style.label}</span>
                  <span style={{ color: style.color }}>◆</span>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Play/Call/Accept Buttons - Center of screen */}
      <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3">
        {isMyTurn && isPlaying && selectedCards.size > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handlePlayCards}
            className="px-10 py-3 bg-cyan-theme-bg border-2 border-cyan-theme hover:bg-cyan-theme hover:text-bg-body rounded-lg text-sm font-bold text-cyan-theme tracking-widest uppercase transition-all duration-200 cursor-pointer"
          >
            PLAY {selectedCards.size} CARD{selectedCards.size > 1 ? 'S' : ''}
          </motion.button>
        )}

        {isCalling && canCall && localPlayer.isAlive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <button
              onClick={handleCallLiarClick}
              className="px-10 py-3 bg-red-theme-bg border-2 border-red-theme hover:bg-red-theme hover:text-bg-body rounded-lg text-sm font-bold text-red-theme tracking-widest uppercase transition-all duration-200 cursor-pointer animate-pulse"
            >
              CALL LIAR!
            </button>
            <button
              onClick={handleAcceptClick}
              className="px-10 py-3 bg-surface-2 border-2 border-cyan-theme-muted hover:border-cyan-theme hover:bg-cyan-theme-bg rounded-lg text-sm font-bold text-cyan-theme tracking-widest uppercase transition-all duration-200 cursor-pointer"
            >
              ACCEPT
            </button>
          </motion.div>
        )}
      </div>

      {/* Local Player Avatar */}
      <div className="absolute bottom-6 left-6 z-20">
        <AnimatePresence>
          {(isPlaying || isCalling) && isMyTurn && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: [0, -6, 0] }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                opacity: { duration: 0.2 },
                x: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -right-10 top-1/2 -translate-y-1/2"
            >
              <svg width="24" height="20" viewBox="0 0 24 20" className="text-amber-theme">
                <path
                  d="M 24 10 L 4 10 M 10 3 L 2 10 L 10 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-3 shadow-none">
          <div className={`w-12 h-12 rounded-none bg-surface-3 border flex items-center justify-center font-mono font-black text-base relative transition-all duration-300 ${
            !localPlayer.isAlive ? 'border-red-theme-border opacity-30 bg-red-theme-bg' : 'border-cyan-theme-light'
          }`}>
            {localPlayer.name.substring(0, 2).toUpperCase()}
            {!localPlayer.isAlive ? (
              <div className="absolute inset-0 bg-red-theme-bg rounded-none flex items-center justify-center">
                <X size={20} className="text-red-theme/60 stroke-[3px]" />
              </div>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rotate-45 bg-emerald-theme" />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-bold text-text-theme tracking-wide uppercase flex items-center gap-1.5 font-mono">
              {localPlayer.name}
              <span className="text-[8px] text-text-theme-muted font-extrabold tracking-wider bg-input-theme px-1.5 py-0.5 rounded">// YOU</span>
            </span>
            <span className="text-[9px] font-mono font-extrabold text-text-theme-muted tracking-wider mt-1">
              {!localPlayer.isAlive
                ? '// TERMINATED'
                : isPlaying && isMyTurn
                  ? '// YOUR TURN // SELECT CARDS'
                  : isCalling && isMyTurn
                    ? '// CALL OR ACCEPT'
                    : `CARDS // [0${localPlayer.cardsCount || 0}]`
              }
            </span>
          </div>
          {!localPlayer.isAlive && (
            <button
              onClick={onLeaveAfterDeath}
              className="ml-4 px-4 py-2 bg-surface-3 border border-red-theme-border hover:border-red-theme hover:bg-red-theme-bg rounded-none text-[9px] font-mono font-bold text-red-theme tracking-widest uppercase flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft size={14} />
              RỜI PHÒNG
            </button>
          )}
        </div>
      </div>

      {/* HUD Alert */}
      <AnimatePresence>
        {(hudMessage || botHudMessage) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="bg-panel-solid/95 border-2 border-cyan-theme px-12 py-6 shadow-2xl shadow-cyan-theme/20 flex items-center gap-4">
              <span className={`text-2xl font-black tracking-[0.3em] uppercase font-mono ${hudMessage?.color || botHudMessage?.color || 'text-text-theme'}`}>
                {hudMessage?.text || botHudMessage?.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal Overlay */}
      <AnimatePresence>
        {isRevealing && callResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-surface-3 border-2 border-cyan-theme-light rounded-none p-10 max-w-4xl w-full flex flex-col relative overflow-hidden"
            >
              <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

              <div className="text-center mb-6">
                <h2 className={`text-3xl font-black tracking-widest uppercase font-mono ${callResult.wasLying ? 'text-red-theme' : 'text-emerald-theme'}`}>
                  {callResult.wasLying ? 'LIAR!' : 'TRUTH!'}
                </h2>
                <p className="text-sm text-text-theme-secondary mt-2 font-mono">
                  {callResult.caller} called {callResult.previousPlayer}
                </p>
              </div>

              <div className="flex justify-center gap-4 mb-6">
                {callResult.revealedCards.map((card, index) => {
                  const cardStyle = getCardTypeStyle(card.type);
                  const isTableCard = card.type === tableType || card.type === 'joker';
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2, duration: 0.4 }}
                      className="w-24 h-32 border-2 rounded-none p-2 flex flex-col items-center justify-center bg-card-theme"
                      style={{
                        borderColor: `${cardStyle.color}cc`,
                      }}
                    >
                      <div className="text-4xl" style={{ color: cardStyle.color }}>
                        {cardStyle.icon}
                      </div>
                      <span className="text-[10px] font-bold font-mono mt-1" style={{ color: cardStyle.color }}>
                        {cardStyle.label}
                      </span>
                      {card.type === 'devil' && (
                        <span className="text-[8px] font-bold text-red-theme mt-1">DEVIL</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {devilReveal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-theme-bg border border-red-theme p-4 mb-4 text-center"
                >
                  <p className="text-red-theme font-bold tracking-widest uppercase font-mono">
                    DEVIL CARD REVEALED!
                  </p>
                  <p className="text-red-theme/80 text-sm mt-1 font-mono">
                    {devilReveal.ownerName} played the Devil Card!
                  </p>
                  <p className="text-red-theme/80 text-sm font-mono">
                    ALL PLAYERS MUST FACE ROULETTE!
                  </p>
                </motion.div>
              )}

              <div className="text-center">
                <p className="text-text-theme-secondary text-sm font-mono">
                  {callResult.wasLying
                    ? `${callResult.previousPlayer} must face roulette!`
                    : `${callResult.caller} must face roulette!`
                  }
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
