import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, WifiHigh, Globe, Robot, BookOpen } from '@phosphor-icons/react';
import { ConnectionStatus } from '../types';
import { Sounds } from '../audio/Sounds';
import { ThemeToggle } from './ThemeToggle';

const RANDOM_NAMES = [
  'PHANTOM', 'CIPHER', 'GHOST', 'ROGUE', 'SHADOW', 'NEXUS', 'VIPER', 'STORM',
  'BLAZE', 'FROST', 'RAVEN', 'TITAN', 'SPARK', 'VENOM', 'WRAITH', 'ZENITH',
  'APEX', 'BOLT', 'CRUX', 'DRIFT', 'ECHO', 'FLUX', 'GRID', 'HAZE',
  'ION', 'JOLT', 'KNOT', 'LYNX', 'MESH', 'NOVA', 'ONYX', 'PELT',
  'QUARK', 'RIFT', 'SURGE', 'TALON', 'ULTRA', 'VOID', 'WAVE', 'XENON',
  'YIELD', 'ZERO', 'ATLAS', 'BRISK', 'CORAL', 'DAWN', 'EDGE', 'FOAM',
  'GUST', 'HAWK', 'IRON', 'JADE', 'KARMA', 'LUNA', 'MIST', 'NEON',
  'OPAL', 'PEARL', 'RAIN', 'SAGE', 'TEAL', 'UNITY', 'VALE', 'WHISPER'
];

function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#_$%@&0123456789ABCDEF';

interface MainMenuProps {
  connect: (mode: string, name: string, ip?: string) => void;
  startBot: (count: number) => void;
  error: string;
  status: ConnectionStatus;
}

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  size: 1 + Math.random() * 2.5,
  duration: 10 + Math.random() * 15,
  delay: Math.random() * 8,
  opacity: 0.2 + Math.random() * 0.3,
}));

export function MainMenu({ connect, startBot, error, status }: MainMenuProps) {
  const [name, setName] = useState<string>('');
  const [showBotModal, setShowBotModal] = useState<boolean>(false);
  const [showLanModal, setShowLanModal] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [lanServers, setLanServers] = useState<any[]>([]);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(1);
  const [manualIp, setManualIp] = useState<string>('');
  const [isSearchingLan, setIsSearchingLan] = useState<boolean>(false);

  const [titleChars, setTitleChars] = useState(() => 'CROWWDILNATE'.split('').map(() => SCRAMBLE_CHARS[0]));
  const [titleSettled, setTitleSettled] = useState(() => Array(12).fill(false));
  const scrambleTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    const target = 'CROWWDILNATE';
    target.split('').forEach((finalChar, i) => {
      const letterDelay = i * 50;
      const letterDuration = 700 + Math.random() * 400;
      const letterStart = Date.now() + letterDelay;
      let frame = 0;

      const interval = setInterval(() => {
        const elapsed = Date.now() - letterStart;
        if (elapsed < 0) return;
        const progress = Math.min(elapsed / letterDuration, 1);
        if (progress >= 1) {
          setTitleChars(prev => { const n = [...prev]; n[i] = finalChar; return n; });
          setTitleSettled(prev => { const n = [...prev]; n[i] = true; return n; });
          clearInterval(interval);
          return;
        }
        frame++;
        const speed = Math.max(1, Math.floor(4 - progress * 3));
        if (frame % speed === 0) {
          const rand = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          setTitleChars(prev => { const n = [...prev]; n[i] = rand; return n; });
        }
      }, 30);
      scrambleTimers.current.push(interval);
    });
    return () => scrambleTimers.current.forEach(clearInterval);
  }, []);

  const handleSubmit = (mode: string, ip?: string) => {
    Sounds.buttonClick();
    const finalName = name.trim().toUpperCase() || getRandomName();
    connect(mode, finalName, ip);
  };

  const handleLanClick = async () => {
    Sounds.buttonClick();
    setShowLanModal(true);
    setIsSearchingLan(true);
    try {
      const baseHost = window.location.hostname || 'localhost';
      const res = await fetch(`http://${baseHost}:3000/lan-servers`);
      const data = await res.json();
      setLanServers(data.servers || []);
    } catch (e) {
      console.error('Failed to fetch LAN servers', e);
    } finally {
      setIsSearchingLan(false);
    }
  };

  const handleBotStart = () => {
    Sounds.buttonClick();
    const finalName = name.trim().toUpperCase() || getRandomName();
    startBot(selectedBotCount);
  };

  const handleButtonClick = (onClickType: string) => {
    if (onClickType === 'lan') handleLanClick();
    else if (onClickType === 'bot') setShowBotModal(true);
    else if (onClickType === 'howto') setShowHowToPlay(true);
    else handleSubmit(onClickType);
  };

  return (
    <>
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-surface">
        <div className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:32px_32px] grid-breathe opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-body via-transparent to-bg-body opacity-50" />

        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-cyan-theme"
            style={{
              left: p.left,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              opacity: 0,
              animation: `float-particle ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Centered layout */}
      <div className="w-full h-screen flex flex-col items-center justify-center z-10 px-4">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="select-none mb-10"
        >
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-mono font-black tracking-tight text-center leading-none">
            {titleChars.map((char, i) => (
              <span
                key={i}
                className="inline-block transition-colors duration-100"
                style={{
                  textShadow: titleSettled[i]
                    ? '0 0 20px var(--cyan-theme-light), 0 0 40px var(--cyan-theme-muted), 0 0 60px var(--cyan-theme-muted)'
                    : '0 0 8px var(--cyan-theme)',
                  color: titleSettled[i] ? undefined : 'var(--cyan-theme)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </motion.div>

        {/* Name input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8 w-full max-w-sm"
        >
          <div className="border border-border-theme rounded-xl p-4 flex flex-col space-y-2 bg-input-theme">
            <label className="font-mono text-[9px] text-text-theme-muted tracking-widest">
              // ENTER_NAME
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
                disabled={status === 'connecting'}
                className="bg-transparent text-2xl font-mono font-bold text-text-theme focus:outline-none w-full uppercase tracking-wider placeholder-text-theme-dim"
                placeholder="INPUT_NAME"
              />
              <span className="w-2 h-5 bg-text-theme/40 terminal-cursor" />
            </div>
          </div>
        </motion.div>

        {/* Button grid - 2x2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid grid-cols-2 gap-4 w-full max-w-md mb-6"
        >
          <ButtonBox label="ONLINE" icon={Globe} onClick={() => handleButtonClick('online')} delay={0.7} />
          <ButtonBox label="LAN" icon={WifiHigh} onClick={() => handleButtonClick('lan')} delay={0.8} />
          <ButtonBox label="VS CPU" icon={Robot} onClick={() => handleButtonClick('bot')} delay={0.9} />
          <ButtonBox label="HOW TO PLAY" icon={BookOpen} onClick={() => handleButtonClick('howto')} delay={1.0} />
        </motion.div>

        {/* Status / Error */}
        <div className="h-12 flex items-center justify-center">
          {status === 'connecting' && (
            <div className="text-[10px] text-amber-theme font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 bg-amber-theme-bg border border-amber-theme-border px-4 py-3 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-theme opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-theme"></span>
              </span>
              CONNECTING...
            </div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-red-theme font-mono font-extrabold tracking-widest uppercase border border-red-theme-border bg-red-theme-bg px-4 py-3 rounded-lg"
            >
              EXCEPTION // {error}
            </motion.div>
          )}
        </div>

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-text-theme-dim tracking-wider text-center"
        >
          v2.0.26 // SECURE PROTOCOL
        </motion.div>
      </div>

      {/* LAN Modal */}
      <AnimatePresence>
        {showLanModal && (
          <ModalOverlay onClose={() => setShowLanModal(false)}>
            <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-pulse"></span>
              // DISCOVERED LAN SERVERS
            </h3>
            <div className="flex flex-col space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {isSearchingLan ? (
                <div className="text-[10px] text-amber-theme font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 p-5 border border-border-theme rounded-lg bg-input-theme">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-theme opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-theme"></span>
                  </span>
                  SCANNING FREQUENCIES...
                </div>
              ) : lanServers.length > 0 ? (
                lanServers.map((server, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowLanModal(false); handleSubmit('lan', `${server.ip}:${server.port}`); }}
                    className="flex items-center justify-between p-4 bg-input-theme border border-border-theme rounded-lg hover:border-emerald-theme-border hover:bg-emerald-theme-bg transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-bold text-text-theme-secondary uppercase font-mono">{server.name}</span>
                      <span className="text-[9px] text-text-theme-muted font-mono bg-surface-2 px-2 py-0.5 rounded">{server.ip}:{server.port}</span>
                    </div>
                    <ArrowRight size={18} className="text-text-theme-muted group-hover:text-emerald-theme group-hover:translate-x-1 transition-all duration-200" />
                  </button>
                ))
              ) : (
                <div className="text-[9px] font-mono text-text-theme-muted font-bold tracking-widest uppercase p-6 border border-dashed border-border-theme rounded-lg text-center bg-input-theme">
                  NO ACTIVE SERVERS FOUND
                </div>
              )}
            </div>
            <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-3">// MANUAL IP</h3>
            <div className="flex space-x-3 mb-6">
              <input
                type="text"
                placeholder="192.168.1.X:3000"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                className="flex-1 bg-input-theme border border-border-theme rounded-lg px-4 py-3 text-sm text-text-theme placeholder-text-theme-dim focus:outline-none focus:border-border-theme-hover font-mono uppercase"
              />
              <button
                onClick={() => { if (manualIp) { setShowLanModal(false); handleSubmit('lan', manualIp); } }}
                className="px-6 py-3 bg-red-theme-bg border border-red-theme-border text-[9px] font-mono font-bold text-red-theme tracking-widest uppercase rounded-lg hover:bg-red-theme-bg-hover hover:border-red-theme transition-all duration-200 cursor-pointer"
              >
                CONNECT
              </button>
            </div>
            <ModalFooter onClose={() => setShowLanModal(false)} />
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Bot Modal */}
      <AnimatePresence>
        {showBotModal && (
          <ModalOverlay onClose={() => setShowBotModal(false)}>
            <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-theme animate-pulse"></span>
              // SELECT BOT COUNT
            </h3>
            <div className="flex gap-3 mb-8 w-full justify-center">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => { Sounds.buttonClick(); setSelectedBotCount(count); }}
                  className={`w-24 h-24 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                    selectedBotCount === count
                      ? 'bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme'
                      : 'bg-input-theme border-border-theme text-text-theme-muted hover:border-border-theme-strong hover:text-text-theme-secondary'
                  }`}
                >
                  <span className="font-mono text-3xl font-black">{count}</span>
                  <span className="font-mono text-[9px] tracking-widest uppercase">BOTS</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 w-full border-t border-border-theme pt-5">
              <button onClick={() => setShowBotModal(false)}
                className="flex-1 py-3 bg-input-theme border border-border-theme text-[9px] font-mono font-bold text-text-theme-muted tracking-wider uppercase rounded-lg hover:border-red-theme-border hover:text-red-theme transition-all duration-200 cursor-pointer"
              >
                CANCEL
              </button>
              <button onClick={handleBotStart}
                className="flex-1 py-3 bg-emerald-theme-bg border border-emerald-theme-border text-[9px] font-mono font-bold text-emerald-theme tracking-wider uppercase rounded-lg hover:bg-emerald-theme-bg-hover hover:border-emerald-theme transition-all duration-200 cursor-pointer"
              >
                START
              </button>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* How To Play Modal */}
      <AnimatePresence>
        {showHowToPlay && (
          <ModalOverlay onClose={() => setShowHowToPlay(false)}>
            <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-theme animate-pulse"></span>
              // HOW TO PLAY
            </h3>
            <div className="space-y-4 text-text-theme-secondary font-mono text-xs leading-relaxed max-h-80 overflow-y-auto pr-1">
              <Section title="OBJECTIVE" text="Bluff your way through rounds. Play cards face-down and declare what they are. If you're caught lying, you face the gun." />
              <Section title="GAMEPLAY" text="Each player gets 5 cards from a 20-card deck (6 King, 6 Queen, 6 Ace, 2 Joker). On your turn, play 1-3 cards face-down and declare a card type (King, Queen, or Ace)." />
              <Section title="DECLARING" text="When you play cards, you MUST declare a card type. For example: 'I play 2 Kings'. The declared type must match what you actually played — or you can bluff!" />
              <Section title="CALLING LIAR" text="After someone plays cards, the next player can CALL LIAR or ACCEPT. If called: cards are revealed. If the declaration was a lie, the bluffer gets shot. If truthful, the caller gets shot." />
              <Section title="THE GUN" text="6 chambers, 1 bullet. Getting shot means elimination. The gun resets only when someone dies. Survive to win!" />
              <Section title="JOKER" text="Jokers are wild — they match any declared type. But if a Joker is revealed during a call, ALL other players must face the gun!" />
            </div>
            <div className="mt-6">
              <ModalFooter onClose={() => setShowHowToPlay(false)} />
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  );
}

function ButtonBox({ label, icon: Icon, onClick, delay }: { label: string; icon: any; onClick: () => void; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.04, boxShadow: '0 0 20px 4px var(--cyan-theme-light)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-input-theme border-2 border-border-theme rounded-xl font-mono font-bold text-text-theme-secondary tracking-widest uppercase cursor-pointer transition-colors duration-200 hover:border-cyan-theme hover:bg-cyan-theme-muted hover:text-cyan-theme"
    >
      <Icon size={28} className="text-text-theme-muted" />
      <span className="text-xs">{label}</span>
    </motion.button>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-panel-solid border border-border-theme rounded-lg p-8 max-w-md w-full flex flex-col relative"
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-theme-strong to-transparent"></div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end border-t border-border-theme pt-4">
      <button onClick={onClose}
        className="px-5 py-2 bg-input-theme border border-border-theme hover:border-red-theme-border text-[9px] font-mono font-bold text-text-theme-muted tracking-wider uppercase rounded-lg hover:text-text-theme hover:bg-red-theme-bg transition-all duration-200 cursor-pointer"
      >
        CLOSE
      </button>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-l-2 border-cyan-theme-muted pl-3">
      <h4 className="text-cyan-theme font-bold mb-1">{title}</h4>
      <p className="text-text-theme-muted text-[11px]">{text}</p>
    </div>
  );
}
