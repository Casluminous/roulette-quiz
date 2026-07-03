import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlashEffect as SlashEffectType } from '../types';

interface SlashEffectProps {
  data: SlashEffectType;
  onComplete: () => void;
}

export function SlashEffect({ data, onComplete }: SlashEffectProps) {
  const [phase, setPhase] = useState<'appear' | 'spin' | 'slash' | 'result' | 'fade'>('appear');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('spin'), 300));
    timers.push(setTimeout(() => setPhase('slash'), 1000));
    timers.push(setTimeout(() => setPhase('result'), 1300));
    timers.push(setTimeout(() => setPhase('fade'), 2200));
    timers.push(setTimeout(() => onComplete(), 2500));
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
            animate={{ opacity: [0, 0.25, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Knife icon — appears, spins, then slashes */}
      <AnimatePresence>
        {(phase === 'appear' || phase === 'spin' || phase === 'slash') && (
          <motion.div
            key="knife"
            className="absolute left-1/2 top-1/2 text-[80px] select-none"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,0,64,0.8))' }}
            initial={{ opacity: 0, scale: 0.3, x: '-50%', y: '-50%' }}
            animate={
              phase === 'appear'
                ? { opacity: 1, scale: 1, rotate: 0, x: '-50%', y: '-50%' }
                : phase === 'spin'
                ? { opacity: 1, scale: 1, rotate: 360, x: '-50%', y: '-50%' }
                : { opacity: 0, scale: 1.8, rotate: 360, x: '-50%', y: '30%' }
            }
            exit={{ opacity: 0 }}
            transition={
              phase === 'spin'
                ? { rotate: { duration: 0.7, ease: 'easeInOut' }, default: { duration: 0.3 } }
                : phase === 'slash'
                ? { duration: 0.3, ease: 'easeIn' }
                : { duration: 0.3 }
            }
          >
            🗡
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-target results */}
      <AnimatePresence>
        {phase === 'result' && targets.map((target) => (
          <motion.div
            key={`result-${target.id}`}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Target name badge */}
            <motion.div
              className="absolute top-[38%] px-4 py-1.5 rounded-lg border"
              style={{
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
              /* DEAD: 2 slash marks */
              <>
                {/* Slash 1 — diagonal top-left to bottom-right */}
                <motion.div
                  className="absolute w-[200px] h-[4px] left-1/2 top-1/2"
                  style={{
                    marginLeft: '-100px',
                    marginTop: '-2px',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '-35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
                />
                {/* Slash 2 — diagonal top-right to bottom-left */}
                <motion.div
                  className="absolute w-[200px] h-[4px] left-1/2 top-1/2"
                  style={{
                    marginLeft: '-100px',
                    marginTop: '-2px',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.2, ease: 'easeOut' }}
                />
                {/* X mark in center */}
                <motion.div
                  className="absolute text-[40px] font-black"
                  style={{
                    color: '#ff0040',
                    textShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                  }}
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: [0, 1, 0.8], scale: [2, 1, 1] }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                >
                  ✕
                </motion.div>
              </>
            ) : (
              /* ALIVE: small shake + red flash on name */
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  x: [0, -4, 6, -3, 4, -2, 0],
                }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.div
                  className="px-3 py-1 rounded border border-emerald-theme/50 bg-emerald-theme/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0.6] }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                >
                  <span className="text-emerald-theme text-xs font-black tracking-widest uppercase">
                    SURVIVED
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Fade to black */}
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
