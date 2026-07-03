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

      {/* Knife — appears above avatar, spins, then slashes DOWN into avatar */}
      <AnimatePresence>
        {(phase === 'appear' || phase === 'spin' || phase === 'slash') && (
          <motion.div
            key="knife"
            className="absolute left-1/2 text-[80px] select-none z-[110]"
            style={{
              filter: 'drop-shadow(0 0 25px rgba(255,0,64,0.9))',
              marginLeft: '-40px',
            }}
            initial={{ opacity: 0, scale: 0.3, top: '15%', rotate: 0 }}
            animate={
              phase === 'appear'
                ? { opacity: 1, scale: 1, top: '15%', rotate: 0 }
                : phase === 'spin'
                ? { opacity: 1, scale: 1, top: '15%', rotate: 360 }
                : { opacity: 0, scale: 1.5, top: '22%', rotate: 360 }
            }
            exit={{ opacity: 0 }}
            transition={
              phase === 'spin'
                ? { rotate: { duration: 0.7, ease: 'easeInOut' }, default: { duration: 0.3 } }
                : phase === 'slash'
                ? { duration: 0.35, ease: [0.36, 0, 0.66, -0.56] }
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
            className="absolute inset-0 pointer-events-none z-[105]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Target name badge — at avatar position (top ~18%) */}
            <motion.div
              className="absolute left-1/2 px-4 py-1.5 rounded-lg border"
              style={{
                top: '18%',
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
              /* DEAD: 2 slash marks + X at avatar area */
              <>
                {/* Slash 1 — top-left to bottom-right */}
                <motion.div
                  className="absolute h-[4px]"
                  style={{
                    width: '220px',
                    left: 'calc(50% - 110px)',
                    top: 'calc(18% - 2px)',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '-35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
                />
                {/* Slash 2 — top-right to bottom-left */}
                <motion.div
                  className="absolute h-[4px]"
                  style={{
                    width: '220px',
                    left: 'calc(50% - 110px)',
                    top: 'calc(18% - 2px)',
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 15%, #ff0040 85%, transparent 100%)',
                    boxShadow: '0 0 15px #ff0040, 0 0 30px #ff0040',
                    transformOrigin: 'center center',
                    rotate: '35deg',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 1, 0.7] }}
                  transition={{ duration: 0.25, delay: 0.2, ease: 'easeOut' }}
                />
                {/* X mark at avatar */}
                <motion.div
                  className="absolute left-1/2 text-[44px] font-black"
                  style={{
                    top: 'calc(18% - 22px)',
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
              /* ALIVE: small screen shake + SURVIVED badge */
              <motion.div
                className="absolute inset-0"
                animate={{ x: [0, -5, 7, -4, 5, -2, 0] }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.div
                  className="absolute left-1/2 px-3 py-1 rounded border"
                  style={{
                    top: 'calc(18% + 20px)',
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
