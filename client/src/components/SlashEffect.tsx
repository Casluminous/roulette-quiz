import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlashEffect as SlashEffectType } from '../types';

interface SlashEffectProps {
  data: SlashEffectType;
  onComplete: () => void;
}

export function SlashEffect({ data, onComplete }: SlashEffectProps) {
  const [phase, setPhase] = useState<'shake' | 'flash' | 'slash' | 'hold' | 'fade'>('shake');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('flash'), 200));
    timers.push(setTimeout(() => setPhase('slash'), 400));
    timers.push(setTimeout(() => setPhase('hold'), 800));
    timers.push(setTimeout(() => setPhase('fade'), 1100));
    timers.push(setTimeout(() => onComplete(), 1400));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <AnimatePresence>
        {(phase === 'shake' || phase === 'flash') && (
          <motion.div
            key="screen-shake"
            className="absolute inset-0"
            animate={{
              x: [0, -6, 8, -4, 6, -2, 0],
              y: [0, 4, -6, 3, -4, 2, 0],
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'flash' || phase === 'slash' || phase === 'hold') && (
          <motion.div
            key="red-flash"
            className="absolute inset-0 bg-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.15, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'slash' || phase === 'hold') && (
          <>
            {data.players.map((player) => (
              <motion.div
                key={`slash-${player.id}`}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  className="absolute w-[120%] h-[3px] left-[-10%]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #ff0040 20%, #ff0040 80%, transparent 100%)',
                    boxShadow: '0 0 20px #ff0040, 0 0 40px #ff0040, 0 0 80px #ff0040',
                  }}
                  initial={{ x: '-120%', opacity: 0 }}
                  animate={{ x: '120%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute text-red-theme font-black text-lg tracking-widest uppercase"
                  style={{
                    textShadow: '0 0 10px #ff0040, 0 0 20px #ff0040',
                  }}
                  initial={{ opacity: 0, scale: 1.5 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.8] }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  {player.name}
                </motion.div>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'fade' && (
          <motion.div
            key="fade-overlay"
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
