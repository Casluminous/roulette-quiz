import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { ArrowLeft, Plus, Users, Shield, CheckCircle, WarningCircle, Copy, Check } from '@phosphor-icons/react';
import { Player } from '../types';
import { Sounds } from '../audio/Sounds';

interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

interface PlayingRoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  tableType: string;
  round: number;
}

interface LobbyProps {
  roomId: string;
  players: Player[];
  localId: string;
  error: string;
  disconnect: () => void;
}

export function Lobby({ roomId, players, localId, error, disconnect }: LobbyProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalCode, setModalCode] = useState<string>('');
  const [shakeModal, setShakeModal] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [playingRooms, setPlayingRooms] = useState<PlayingRoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchRooms = useCallback(async () => {
    if (roomId) return;
    setLoadingRooms(true);
    try {
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = `http://${window.location.hostname}:3000`;
      } else {
        baseUrl = window.location.origin;
      }
      const res = await fetch(`${baseUrl}/api/rooms`);
      const data = await res.json();
      setAvailableRooms(data.rooms || []);
      setPlayingRooms(data.playing || []);
    } catch {
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Backspace') {
        setModalCode(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleJoinSubmit();
      } else if (e.key.length === 1 && modalCode.length < 6) {
        const regex = /^[a-zA-Z0-9]$/;
        if (regex.test(e.key)) {
          setModalCode(prev => prev + e.key.toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, modalCode]);

  const openModal = () => {
    Sounds.buttonClick();
    setModalCode('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleCreate = () => {
    Sounds.buttonClick();
    socketClient.createRoom(socketClient.playerName || 'GUEST');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    if (pasted.length > 0) {
      setModalCode(pasted);
    }
  };

  const handleJoinSubmit = () => {
    if (modalCode.length === 6) {
      Sounds.buttonClick();
      socketClient.joinRoom(modalCode, socketClient.playerName || 'GUEST');
      closeModal();
    } else {
      Sounds.wrong();
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 500);
    }
  };

  const toggleReady = () => {
    if (!roomId) return;
    const nextReady = !isReady;
    setIsReady(nextReady);
    socketClient.toggleReady(roomId);
  };

  const copyRoomCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-6xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start z-10 relative py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">LOBBY // ROOM_WAITING_STATE</span>
          <h2 className="text-sm font-extrabold text-text-theme-secondary">
            {roomId ? 'PROTOCOL SECURED' : 'AWAITING PROTOCOL ACTION...'}
          </h2>
        </div>

        {roomId ? (
          <>
            <div className="relative border border-cyan-theme rounded-2xl p-8 bg-panel-solid/80 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden max-w-sm w-full shadow-lg shadow-cyan-theme/10">
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-theme"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-theme"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-theme"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-theme"></div>
              <span className="text-[9px] text-cyan-theme font-extrabold tracking-widest uppercase mb-3">ROOM_ACCESS_CODE</span>
              <span className="text-6xl font-black tracking-[10px] text-cyan-theme select-text mb-4">
                {roomId}
              </span>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-theme-bg border border-cyan-theme rounded-lg text-[10px] font-mono font-bold text-cyan-theme tracking-wider uppercase hover:bg-cyan-theme hover:text-bg-body transition-all cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'COPIED!' : 'COPY CODE'}
              </button>
            </div>

            <button
              onClick={toggleReady}
              className={`w-full py-5 rounded-2xl text-base font-extrabold tracking-widest uppercase flex items-center justify-center transition-all duration-300 border cursor-pointer ${
                isReady
                  ? 'bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme hover:bg-emerald-theme-bg-hover'
                  : 'bg-red-theme-bg border-red-theme-border text-red-theme hover:bg-red-theme-bg-hover'
              }`}
            >
              {isReady ? 'AWAITING PROTOCOL START...' : 'ENGAGE READY STATE'}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col space-y-3 max-w-sm w-full">
              <button
                onClick={handleCreate}
                className="group w-full py-5 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-emerald-theme-border hover:bg-surface-2 rounded-xl text-sm font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-6 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Plus size={20} className="text-text-theme-muted group-hover:text-emerald-theme transition-colors" />
                  CREATE PROTOCOL
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
              <button
                onClick={openModal}
                className="group w-full py-5 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-cyan-theme-border hover:bg-surface-2 rounded-xl text-sm font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-6 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-cyan-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Shield size={20} className="text-text-theme-muted group-hover:text-cyan-theme transition-colors" />
                  JOIN PROTOCOL
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
            </div>

            {availableRooms.length > 0 && (
              <div className="flex flex-col space-y-2 max-w-sm w-full">
                <span className="text-[10px] text-emerald-theme font-extrabold tracking-widest uppercase">OPEN_PROTOCOLS // {availableRooms.length} AVAILABLE</span>
                <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {availableRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        Sounds.buttonClick();
                        socketClient.joinRoom(room.id, socketClient.playerName || 'GUEST');
                      }}
                      className="group w-full py-3 bg-panel-solid/60 backdrop-blur-sm border border-border-theme hover:border-emerald-theme-border hover:bg-surface-2 rounded-xl text-xs font-extrabold text-text-theme-secondary tracking-wider uppercase flex items-center justify-between px-5 transition-all duration-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-emerald-theme font-black tracking-[4px]">{room.id}</span>
                      </span>
                      <span className="flex items-center gap-2 text-text-theme-muted">
                        <Users size={14} />
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableRooms.length === 0 && !loadingRooms && (
              <div className="flex flex-col space-y-2 max-w-sm w-full">
                <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">OPEN_PROTOCOLS //</span>
                <div className="text-text-theme-muted text-xs py-3 px-5 border border-dashed border-border-theme rounded-xl bg-input-theme flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-theme-dim animate-pulse" /> No waiting rooms — create one!
                </div>
              </div>
            )}

            {playingRooms.length > 0 && (
              <div className="flex flex-col space-y-2 max-w-sm w-full">
                <span className="text-[10px] text-amber-theme font-extrabold tracking-widest uppercase">ACTIVE_PROTOCOLS // {playingRooms.length} LIVE</span>
                <div className="flex flex-col space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {playingRooms.map((room) => (
                    <div
                      key={room.id}
                      className="w-full py-3 bg-panel-solid/40 border border-amber-theme/30 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center justify-between px-5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-amber-theme font-black tracking-[4px]">{room.id}</span>
                        <span className="text-[8px] font-mono text-text-theme-dim">
                          {room.tableType.toUpperCase()}'S TABLE // R{room.round.toString().padStart(2, '0')}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-amber-theme/70">
                        <Users size={14} />
                        {room.playerCount}/{room.maxPlayers}
                        <span className="text-[8px] ml-1 px-1.5 py-0.5 bg-amber-theme/10 text-amber-theme rounded">LIVE</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <button onClick={disconnect}
          className="max-w-max flex items-center gap-2 text-text-theme-muted hover:text-text-theme hover:translate-x-[-2px] transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
        >
          <ArrowLeft size={18} /> RETURN_TO_MENU
        </button>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <span className="text-xs text-text-theme-muted font-extrabold tracking-widest uppercase mb-1">
          {roomId ? 'CONNECTED ENTITIES //' : 'HOW TO PLAY //'}
        </span>

        {roomId ? (
          <div className="flex flex-col space-y-3 w-full">
            {players.map((player) => (
              <div key={player.id}
                className="w-full bg-panel-solid/80 backdrop-blur-sm border border-border-theme rounded-xl px-5 py-4 flex items-center justify-between shadow-sm hover:border-border-theme-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-sm ${
                    player.id === localId
                      ? 'bg-emerald-theme-bg text-emerald-theme border border-emerald-theme-border'
                      : 'bg-cyan-theme-bg text-cyan-theme border border-cyan-theme-border'
                  }`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-extrabold text-text-theme tracking-wide uppercase">
                    {player.name} {player.id === localId && <span className="text-[10px] text-text-theme-muted font-normal italic">(YOU)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold tracking-wider ${
                    player.isReady ? 'text-emerald-theme' : 'text-text-theme-dim'
                  }`}>
                    {player.isReady ? 'READY' : 'AWAITING'}
                  </span>
                  {player.isReady ? (
                    <CheckCircle size={20} className="text-emerald-theme" />
                  ) : (
                    <WarningCircle size={20} className="text-text-theme-dim animate-pulse" />
                  )}
                </div>
              </div>
            ))}
            {players.length < 4 && (
              <div className="text-text-theme-dim text-[10px] font-mono py-3 px-4 border border-dashed border-border-theme rounded-xl bg-input-theme flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-theme animate-pulse" />
                Waiting for {4 - players.length} more player{players.length < 3 ? 's' : ''}...
              </div>
            )}
          </div>
        ) : (
          <div className="bg-panel-solid/60 border border-border-theme rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-theme-bg border border-emerald-theme-border flex items-center justify-center text-[10px] font-mono font-bold text-emerald-theme">1</span>
                <span className="text-xs font-bold text-text-theme-secondary">Create or Join a room</span>
              </div>
              <p className="text-[10px] font-mono text-text-theme-dim pl-7">Click CREATE to host, or JOIN with a 6-digit code</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-cyan-theme-bg border border-cyan-theme-border flex items-center justify-center text-[10px] font-mono font-bold text-cyan-theme">2</span>
                <span className="text-xs font-bold text-text-theme-secondary">Ready up with 2+ players</span>
              </div>
              <p className="text-[10px] font-mono text-text-theme-dim pl-7">Both players must ENGAGE READY STATE to begin</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-red-theme-bg border border-red-theme-border flex items-center justify-center text-[10px] font-mono font-bold text-red-theme">3</span>
                <span className="text-xs font-bold text-text-theme-secondary">Bluff, call, survive</span>
              </div>
              <p className="text-[10px] font-mono text-text-theme-dim pl-7">Play cards, call liar, pull the trigger — last one standing wins</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-[10px] text-red-theme font-extrabold tracking-widest uppercase border border-red-theme-border bg-red-theme-bg px-4 py-3 rounded-xl max-w-sm mt-4 shadow-md">
            EXCEPTION // {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0, x: shakeModal ? [0, -10, 10, -10, 10, 0] : 0 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: shakeModal ? "keyframes" : "spring", stiffness: 350, damping: 25 }}
              className="glass-panel rounded-2xl p-8 max-w-md w-full flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-theme-strong to-transparent"></div>
              <h3 className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-pulse"></span>
                DECRYPT_ACCESS_CODE //
              </h3>
              <div className="flex space-x-2.5 mb-6" onPaste={handlePaste}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = modalCode[index] || '';
                  const isActive = index === modalCode.length;
                  return (
                    <div key={index}
                      className={`w-14 h-14 bg-surface-2 rounded-xl border flex items-center justify-center text-2xl font-black text-red-theme transition-all duration-300 shadow-inner ${
                        isActive ? 'border-red-theme scale-105' : 'border-border-theme'
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-text-theme-dim font-semibold tracking-wide mb-6">
                // Type 6 characters. Press ENTER to connect.
              </span>
              <div className="flex gap-4 w-full">
                <button onClick={closeModal}
                  className="flex-1 py-4 bg-surface-2 border border-border-theme hover:border-red-theme-border text-xs font-extrabold text-text-theme-muted tracking-wider uppercase rounded-xl hover:text-text-theme hover:bg-red-theme-bg transition-all duration-300 cursor-pointer"
                >
                  CANCEL // ESC
                </button>
                <button onClick={handleJoinSubmit}
                  className="flex-1 py-4 bg-red-theme-bg border border-red-theme-border hover:border-red-theme text-xs font-extrabold text-red-theme tracking-wider uppercase rounded-xl hover:bg-red-theme-bg-hover transition-all duration-300 cursor-pointer"
                >
                  CONFIRM // ENTER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
