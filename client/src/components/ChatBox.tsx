import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  roomId: string | null;
  localPlayerId: string;
}

export function ChatBox({ roomId, localPlayerId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-49), msg]);
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleChatHistory = (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
    };

    socketClient.on('chat:message', handleChatMessage);
    socketClient.on('chat:history', handleChatHistory);

    return () => {
      socketClient.off('chat:message', handleChatMessage);
      socketClient.off('chat:history', handleChatHistory);
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || !roomId) return;
    socketClient.sendChat(roomId, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!roomId) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-2 w-72 h-64 bg-panel-solid/95 border border-cyan-theme backdrop-blur-md flex flex-col"
          >
            <div className="px-3 py-2 border-b border-border-theme flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-theme uppercase">
                COMMS // CHAT
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-theme-dim hover:text-text-theme text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
              {messages.length === 0 && (
                <p className="text-[9px] font-mono text-text-theme-dim text-center mt-4">
                  NO MESSAGES YET //
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`${msg.playerId === localPlayerId ? 'text-cyan-theme' : 'text-text-theme-secondary'}`}>
                  <span className="text-[8px] font-mono text-text-theme-dim mr-1">
                    {formatTime(msg.timestamp)}
                  </span>
                  <span className="text-[9px] font-mono font-bold">
                    {msg.playerId === localPlayerId ? 'YOU' : msg.playerName}
                  </span>
                  <span className="text-[9px] font-mono">: {msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-2 py-2 border-t border-border-theme">
              <div className="flex gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.substring(0, 200))}
                  onKeyDown={handleKeyDown}
                  placeholder="TYPE MESSAGE..."
                  className="flex-1 bg-input-theme border border-border-theme px-2 py-1.5 text-[10px] font-mono text-text-theme placeholder-text-theme-dim focus:outline-none focus:border-cyan-theme"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-3 py-1.5 bg-cyan-theme-bg border border-cyan-theme text-[10px] font-mono font-bold text-cyan-theme tracking-wider hover:bg-cyan-theme hover:text-bg-body transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
                >
                  SEND
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 bg-panel-solid/90 border border-cyan-theme flex items-center justify-center cursor-pointer hover:bg-cyan-theme-bg transition-colors"
      >
        <span className="text-cyan-theme text-sm font-mono font-bold">💬</span>
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-theme text-white text-[8px] font-mono font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
