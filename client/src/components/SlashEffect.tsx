import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlashEffect as SlashEffectType } from '../types';

interface SlashEffectProps {
  data: SlashEffectType;
  onComplete: () => void;
}

function KnifeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blade — white outline only */}
      <path
        d="M32 2 L44 58 L39 64 L32 112 L25 64 L20 58 Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Blade highlight */}
      <line x1="32" y1="6" x2="32" y2="108" stroke="white" strokeWidth="0.8" opacity="0.4" />
      {/* Guard */}
      <rect x="14" y="56" width="36" height="7" rx="2" stroke="white" strokeWidth="1.5" />
      {/* Handle */}
      <rect x="25" y="63" width="14" height="30" rx="3" stroke="white" strokeWidth="1.2" />
      {/* Handle grip */}
      <line x1="27" y1="70" x2="37" y2="70" stroke="white" strokeWidth="0.6" opacity="0.5" />
      <line x1="27" y1="76" x2="37" y2="76" stroke="white" strokeWidth="0.6" opacity="0.5" />
      <line x1="27" y1="82" x2="37" y2="82" stroke="white" strokeWidth="0.6" opacity="0.5" />
      <line x1="27" y1="88" x2="37" y2="88" stroke="white" strokeWidth="0.6" opacity="0.5" />
      {/* Pommel */}
      <circle cx="32" cy="96" r="3" stroke="white" strokeWidth="1" />
    </svg>
  );
}

export function SlashEffect({ data, onComplete }: SlashEffectProps) {
  const [phase, setPhase] = useState<'appear' | 'spin' | 'slash' | 'result' | 'fade'>('appear');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('spin'), 300));
    timers.push(setTimeout(() => setPhase('slash'), 1000));
    timers.push(setTimeout(() => setPhase('result'), 1350));
    timers.push(setTimeout(() => setPhase('fade'), 2300));
    timers.push(setTimeout(() => onComplete(), 2600));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const targets = useMemo(() => data.players.map(p => ({
    ...p,
    hasDied: !p.alive,
  })), [data.players]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">

      {/* Red flash overlay */}
      <AnimatePresence>
        {(phase === 'slash' || phase === 'result') && (
          <motion.div
            key="red-flash"
            className="absolute inset-0 bg-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Knife — appears below cards, spins 360°, stabs UP into avatar */}
      <AnimatePresence>
        {(phase === 'appear' || phase === 'spin' || phase === 'slash') && (
          <motion.div
            key="knife"
            className="absolute left-1/2 z-[110]"
            style={{
              marginLeft: '-20px',
              filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.3))',
            }}
            initial={{ opacity: 0, scale: 0.3, top: '68%', rotate: 0 }}
            animate={
              phase === 'appear'
                ? { opacity: 1, scale: 1, top: '68%', rotate: 0 }
                : phase === 'spin'
                ? { opacity: 1, scale: 1.1, top: '68%', rotate: 360 }
                : { opacity: 0, scale: 1.6, top: '16%', rotate: 360 }
            }
            exit={{ opacity: 0 }}
            transition={
              phase === 'spin'
                ? { rotate: { duration: 0.6, ease: 'easeInOut' }, scale: { duration: 0.6, ease: 'easeInOut' }, default: { duration: 0.25 } }
                : phase === 'slash'
                ? { duration: 0.22, ease: [0.55, 0, 1, 0.45] }
                : { duration: 0.25 }
            }
          >
            <KnifeIcon className="w-[44px] h-[80px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-target results at avatar area */}
      <AnimatePresence>
        {phase === 'result' && targets.map((target) => (
          <motion.div
            key={`result-${target.id}`}
            className="absolute inset-0 pointer-events-none z-[105]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Name badge at avatar position */}
            <motion.div
              className="absolute left-1/2 px-4 py-1.5 rounded-lg border"
              style={{
                top: '22%',
                marginLeft: '-60px',
                backgroundColor: target.hasDied ? 'rgba(255,0,64,0.15)' : 'rgba(0,0,0,0.7)',
                borderColor: target.hasDied ? '#ff0040' : 'rgba(255,255,255,0.1)',
                boxShadow: target.hasDied ? '0 0 20px rgba(255,0,64,0.4)' : 'none',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <span
                className="font-black text-sm tracking-widest uppercase"
                style={{ color: target.hasDied ? '#ff0040' : '#fff' }}
              >
                {target.name}
              </span>
            </motion.div>

            {target.hasDied ? (
              /* DEAD: 2 slash marks + X at avatar */
              <>
                {/* Slash 1 */}
                <motion.div
                  className="absolute h-[4px]"
                  style={{
                    width: '200px',
                    left: 'calc(50% - 100px)',
                    top: 'calc(22% + 10px)',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '-35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
                />
                {/* Slash 2 */}
                <motion.div
                  className="absolute h-[4px]"
                  style={{
                    width: '200px',
                    left: 'calc(50% - 100px)',
                    top: 'calc(22% + 10px)',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.2, ease: 'easeOut' }}
                />
                {/* X mark */}
                <motion.div
                  className="absolute left-1/2 text-[44px] font-black"
                  style={{
                    top: 'calc(22% - 8px)',
                    marginLeft: '-22px',
                    color: '#ff0040',
                    textShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                  }}
                  initial={{ opacity: 0, scale: 2.5 }}
                  animate={{ opacity: [0, 1, 0.9], scale: [2.5, 1, 1] }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                >
                  ✕
                </motion.div>
              </>
            ) : (
              /* ALIVE: shake + SURVIVED */
              <motion.div
                className="absolute inset-0"
                animate={{ x: [0, -5, 7, -4, 5, -2, 0] }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.div
                  className="absolute left-1/2 px-3 py-1 rounded border"
                  style={{
                    top: 'calc(22% + 30px)',
                    marginLeft: '-40px',
                    borderColor: 'rgba(34,197,94,0.5)',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0.6] }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                >
                  <span className="text-emerald-theme text-[10px] font-black tracking-widest uppercase">
                    SURVIVED
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Fade */}
      <AnimatePresence>
        {phase === 'fade' && (
          <motion.div
            key="fade-out"
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
