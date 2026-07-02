import React, { useState, useEffect, useCallback } from 'react';
import { socketClient } from './network/SocketClient';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { Screen, ConnectionStatus, GamePhase, Player, Card, TriggerResult, WinnerInfo, TableType, CallResult, DevilReveal, GunState } from './types';
import { Sounds } from './audio/Sounds';
import { useBotGame } from './hooks/useBotGame';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [playerName, setPlayerName] = useState<string>('GUEST');
  const [roomId, setRoomId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [gameMode, setGameMode] = useState<string>('online');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [currentTurnId, setCurrentTurnId] = useState<string>('');
  const [handCards, setHandCards] = useState<Card[]>([]);
  const [tableType, setTableType] = useState<TableType>('king');
  const [playedCount, setPlayedCount] = useState<number>(0);
  const [playedBy, setPlayedBy] = useState<string>('');
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [devilReveal, setDevilReveal] = useState<DevilReveal | null>(null);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [canCall, setCanCall] = useState<boolean>(false);
  const [gunState, setGunState] = useState<GunState>({ bulletsFired: 0, currentPosition: 0, bulletCount: 6 });

  const botCallbacks = {
    setScreen,
    setRound,
    setPhase,
    setCurrentTurnId,
    setHandCards,
    setTriggerResult,
    setPlayers,
    setWinnerInfo,
    setTableType,
    setPlayedCount,
    setPlayedBy,
    setCallResult,
    setCanCall,
  };

  const {
    botMode,
    startBotGame,
    handleBotDisconnect,
    handleBotPlayCards,
    handleBotCallLiar,
    handleBotAcceptPlay,
    botHudMessage,
    isSpectating,
    syncHandCards,
    syncPlayers,
    syncPhase,
    syncCurrentTurn,
  } = useBotGame(playerName, botCallbacks);

  const handleStartBotGame = useCallback((count: number) => {
    setLocalPlayerId('local-player');
    startBotGame(count);
  }, [startBotGame]);

  useEffect(() => { syncHandCards(handCards); }, [handCards, syncHandCards]);
  useEffect(() => { syncPlayers(players); }, [players, syncPlayers]);
  useEffect(() => { syncPhase(phase); }, [phase, syncPhase]);
  useEffect(() => { syncCurrentTurn(currentTurnId); }, [currentTurnId, syncCurrentTurn]);

  const connectToServer = (mode: string, name: string, ip?: string) => {
    setPlayerName(name);
    setGameMode(mode);
    setConnectionStatus('connecting');
    setErrorMsg('');

    let serverUrl: string;
    if (mode === 'lan' && ip) {
      serverUrl = `http://${ip}`;
    } else if (window.location.port === '5173' || window.location.port === '') {
      serverUrl = `http://${window.location.hostname}:3000`;
    } else {
      serverUrl = window.location.origin;
    }

    socketClient.connect(serverUrl)
      .then(() => {
        setConnectionStatus('connected');
        setScreen('lobby');
      })
      .catch((err: Error) => {
        setConnectionStatus('disconnected');
        setErrorMsg('SERVER LINK TIMEOUT. RETRY CONNECTION.');
        console.error(err);
      });
  };

  const handleDisconnect = () => {
    socketClient.disconnect();
    setConnectionStatus('disconnected');
    setScreen('menu');
    setRoomId('');
    setPlayers([]);
    setLocalPlayerId('');
    setHandCards([]);
    setCallResult(null);
    setDevilReveal(null);
    setTriggerResult(null);
    setCanCall(false);
  };

  const handleLeaveAfterDeath = () => {
    if (botMode) {
      handleBotDisconnect();
    } else {
      socketClient.leaveAfterDeath(roomId);
      handleDisconnect();
    }
  };

  const handlePlayCards = (cardIds: string[], declaration: TableType) => {
    if (botMode) {
      handleBotPlayCards(cardIds, declaration);
    } else {
      socketClient.playCards(roomId, cardIds, declaration);
    }
  };

  const handleCallLiar = () => {
    if (botMode) {
      handleBotCallLiar();
    } else {
      socketClient.callLiar(roomId);
    }
  };

  const handleAcceptPlay = () => {
    if (botMode) {
      handleBotAcceptPlay();
    } else {
      socketClient.acceptPlay(roomId);
    }
  };

  useEffect(() => {
    socketClient.on('room:created', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:joined', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:players', (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socketClient.on('room:left', () => {
      setRoomId('');
      setLocalPlayerId('');
      setPlayers([]);
    });

    socketClient.on('game:start', (data: { players: Player[]; round: number }) => {
      setPlayers(data.players);
      setRound(data.round || 1);
      setPhase('waiting');
      setCallResult(null);
      setDevilReveal(null);
      setTriggerResult(null);
      setCanCall(false);
      setScreen('game');
    });

    socketClient.on('game:deal', (data: { cards: Card[]; tableType: TableType; gun?: GunState }) => {
      setHandCards(data.cards);
      setTableType(data.tableType);
      setPhase('playing');
      setCallResult(null);
      setDevilReveal(null);
      if (data.gun) {
        setGunState(data.gun);
      }
    });

    socketClient.on('game:turn', (data: { playerId: string; phase?: string; canCall?: boolean }) => {
      setCurrentTurnId(data.playerId);
      setCanCall(data.canCall || false);
      if (data.phase) {
        setPhase(data.phase as GamePhase);
      } else {
        setPhase('playing');
      }
      setCallResult(null);
      setDevilReveal(null);
    });

    socketClient.on('game:cardsPlayed', (data: { playerName: string; count: number; declaration: TableType }) => {
      setPlayedCount(data.count);
      setPlayedBy(data.playerName);
      setTableType(data.declaration);
      setPhase('calling');
    });

    socketClient.on('game:accepted', (data: { playerName: string }) => {
      setPlayedCount(0);
      setPlayedBy('');
    });

    socketClient.on('game:callResult', (data: CallResult) => {
      setCallResult(data);
      setPhase('revealing');
      Sounds.revealCards();
    });

    socketClient.on('game:devilReveal', (data: DevilReveal) => {
      setDevilReveal(data);
      Sounds.devilReveal();
    });

    socketClient.on('game:trigger', (data: TriggerResult) => {
      setPhase('trigger');
      setTriggerResult({
        alive: data.alive,
        playerId: data.playerId,
        playerName: data.playerName,
        bulletCount: data.bulletCount,
        shotsFired: data.shotsFired,
      });

      if (data.playerId) {
        setPlayers(prev => prev.map(p => {
          if (p.id === data.playerId) {
            return {
              ...p,
              isAlive: data.alive ? p.isAlive : false,
              cardsCount: data.alive ? p.cardsCount : 0,
              shotsFired: data.shotsFired ?? p.shotsFired,
            };
          }
          return p;
        }));
      }

      setTimeout(() => {
        setTriggerResult(null);
        setCallResult(null);
        setDevilReveal(null);
      }, 5000);
    });

    socketClient.on('game:newRound', (data: { round: number; gun?: GunState }) => {
      Sounds.newRound();
      setRound(data.round);
      setCallResult(null);
      setDevilReveal(null);
      if (data.gun) {
        setGunState(data.gun);
      }
    });

    socketClient.on('game:over', (data: { winner: string; winnerId?: string }) => {
      const isLocal = data.winnerId ? data.winnerId === localPlayerId : data.winner === playerName;
      if (isLocal) {
        Sounds.victory();
      }
      setWinnerInfo({
        winner: data.winner,
        isLocalWinner: isLocal
      });
      setPhase('game_over');

      setTimeout(() => {
        setScreen('gameover');
      }, 3000);
    });

    socketClient.on('game:playerLeft', () => {
      setErrorMsg('OPPONENT DISCONNECTED FROM SYSTEM.');
      setTimeout(() => {
        handleDisconnect();
      }, 3000);
    });

    socketClient.on('game:playerLeftAfterDeath', (data: { playerId: string }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socketClient.on('game:cardsUpdate', (data: { players: { id: string; cardsCount: number; isAlive: boolean; shotsFired: number }[]; tableType?: TableType }) => {
      setPlayers(prev => prev.map(p => {
        const update = data.players.find((u: any) => u.id === p.id);
        if (update) {
          return { ...p, cardsCount: update.cardsCount, isAlive: update.isAlive, shotsFired: update.shotsFired };
        }
        return p;
      }));
      if (data.tableType) {
        setTableType(data.tableType);
      }
    });

    socketClient.on('game:roundEnd', (data: { reason: string }) => {
      setPlayedCount(0);
      setPlayedBy('');
    });

    socketClient.on('error', (data: { message: string }) => {
      setErrorMsg('EXCEPTION // ' + data.message.toUpperCase());
    });

    return () => {
      ['room:created', 'room:joined', 'room:players', 'room:left', 'game:start', 'game:deal', 'game:turn', 'game:cardsPlayed', 'game:callResult', 'game:devilReveal', 'game:trigger', 'game:newRound', 'game:over', 'game:playerLeft', 'game:playerLeftAfterDeath', 'game:cardsUpdate', 'game:accepted', 'game:roundEnd', 'error'].forEach(event => {
        socketClient.clearListeners(event);
      });
    };
  }, [playerName, localPlayerId]);

  return (
    <main className="w-screen h-screen tech-grid overflow-hidden relative flex items-center justify-center">
      {screen === 'menu' && (
        <MainMenu
          connect={connectToServer}
          startBot={handleStartBotGame}
          error={errorMsg}
          status={connectionStatus}
        />
      )}
      {screen === 'lobby' && (
        <Lobby
          roomId={roomId}
          players={players}
          localId={localPlayerId}
          error={errorMsg}
          disconnect={handleDisconnect}
        />
      )}
      {screen === 'game' && (
        <GameBoard
          round={round}
          phase={phase}
          players={players}
          localId={localPlayerId}
          currentTurnId={currentTurnId}
          handCards={handCards}
          tableType={tableType}
          playedCount={playedCount}
          playedBy={playedBy}
          callResult={callResult}
          devilReveal={devilReveal}
          triggerResult={triggerResult}
          gunState={gunState}
          canCall={canCall}
          roomId={roomId}
          onLeaveAfterDeath={handleLeaveAfterDeath}
          onPlayCards={botMode ? handleBotPlayCards : handlePlayCards}
          onCallLiar={botMode ? handleBotCallLiar : handleCallLiar}
          onAcceptPlay={botMode ? handleBotAcceptPlay : handleAcceptPlay}
          botHudMessage={botMode ? botHudMessage : null}
          isBotSpectating={botMode ? isSpectating : false}
        />
      )}
      {screen === 'gameover' && (
        <GameOver
          winnerInfo={winnerInfo}
          disconnect={handleDisconnect}
        />
      )}
    </main>
  );
}
