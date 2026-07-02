import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { ArrowLeft, Plus, Users, Shield, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Player } from '../types';
import { Sounds } from '../audio/Sounds';

interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
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
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);

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

  return (
    <div className="w-full max-w-6xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start z-10 relative py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">LOBBY // ROOM_WAITING_STATE</span>
          <h2 className="text-sm font-extrabold text-text-theme-secondary">
            {roomId ? 'PROTOCOL SECURED' : 'AWAITING PROTOCOL ACTION...'}
          </h2>
        </div>

        <div className="relative border border-border-theme rounded-2xl p-10 bg-panel-solid/80 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden max-w-sm w-full shadow-lg">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-red-theme-border"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-red-theme-border"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-red-theme-border"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-red-theme-border"></div>
          <span className="text-[9px] text-text-theme-muted font-extrabold tracking-widest uppercase mb-4">ROOM_ACCESS_CODE</span>
          <span className="text-7xl font-black tracking-[10px] text-text-theme select-text">
            {roomId || '------'}
          </span>
        </div>

        <div className="flex flex-col space-y-4 max-w-sm w-full">
          {!roomId ? (
            <>
              <button 
                onClick={handleCreate}
                className="group w-full py-6 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-red-theme-border hover:bg-surface-2 rounded-2xl text-base font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-8 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Plus size={24} className="text-text-theme-muted group-hover:text-red-theme transition-colors" /> 
                  CREATE PROTOCOL
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
              <button 
                onClick={openModal}
                className="group w-full py-6 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-red-theme-border hover:bg-surface-2 rounded-2xl text-base font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-8 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Shield size={24} className="text-text-theme-muted group-hover:text-red-theme transition-colors" /> 
                  JOIN PROTOCOL
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
            </>
          ) : (
            <button 
              onClick={toggleReady}
              className={`w-full py-6 rounded-2xl text-base font-extrabold tracking-widest uppercase flex items-center justify-center transition-all duration-300 border cursor-pointer ${
                isReady 
                  ? 'bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme hover:bg-emerald-theme-bg-hover' 
                  : 'bg-red-theme-bg border-red-theme-border text-red-theme hover:bg-red-theme-bg-hover'
              }`}
            >
              {isReady ? 'AWAITING PROTOCOL START...' : 'ENGAGE READY STATE'}
            </button>
          )}
        </div>

        {!roomId && availableRooms.length > 0 && (
          <div className="flex flex-col space-y-2 max-w-sm w-full mt-2">
            <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">OPEN_PROTOCOLS //</span>
            <div className="flex flex-col space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
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

        {!roomId && availableRooms.length === 0 && !loadingRooms && (
          <div className="flex flex-col space-y-2 max-w-sm w-full mt-2">
            <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">OPEN_PROTOCOLS //</span>
            <div className="text-text-theme-muted text-xs italic py-4 px-5 border border-dashed border-border-theme rounded-xl bg-input-theme flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-text-theme-dim animate-pulse" /> No active protocols found...
            </div>
          </div>
        )}

        <button onClick={disconnect}
          className="max-w-max flex items-center gap-2 text-text-theme-muted hover:text-text-theme hover:translate-x-[-2px] transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
        >
          <ArrowLeft size={18} /> RETURN_TO_MENU
        </button>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <span className="text-xs text-text-theme-muted font-extrabold tracking-widest uppercase mb-1">CONNECTED ENTITIES //</span>
        <div className="flex flex-col space-y-3 w-full">
          {players.length === 0 ? (
            <div className="text-text-theme-muted text-xs italic py-6 px-6 border border-dashed border-border-theme rounded-2xl bg-input-theme flex items-center gap-3">
              <Users size={18} className="text-text-theme-dim animate-pulse" /> Connecting link is idle...
            </div>
          ) : (
            players.map((player) => (
              <div key={player.id}
                className="w-full bg-panel-solid/80 backdrop-blur-sm border border-border-theme rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm hover:border-border-theme-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-base ${
                    player.id === localId 
                      ? 'bg-emerald-theme-bg text-emerald-theme border border-emerald-theme-border' 
                      : 'bg-red-theme-bg text-red-theme border border-red-theme-border'
                  }`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-base font-extrabold text-text-theme tracking-wide uppercase">
                    {player.name} {player.id === localId && <span className="text-[11px] text-text-theme-muted font-normal italic">(YOU)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-extrabold tracking-wider ${
                    player.isReady ? 'text-emerald-theme font-black' : 'text-red-theme font-black'
                  }`}>
                    {player.isReady ? 'READY' : 'AWAITING'}
                  </span>
                  {player.isReady ? (
                    <CheckCircle size={24} className="text-emerald-theme" />
                  ) : (
                    <WarningCircle size={24} className="text-red-theme animate-pulse" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
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
