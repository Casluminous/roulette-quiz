export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  CARDS_PER_HAND: 5,
  TOTAL_CARDS: 21,
  CARDS_PER_TYPE: { king: 6, queen: 6, ace: 6, joker: 2, devil: 1 },

  TOTAL_CHAMBERS: 6,
  INITIAL_BULLETS: 1,

  TIMEOUTS: {
    dealing: 2000,
    trigger: 3000,
    roundEnd: 3000,
    calling: 15000,
    reveal: 3000,
  },

  STATES: {
    WAITING: 'waiting',
    DEALING: 'dealing',
    PLAYING: 'playing',
    CALLING: 'calling',
    REVEALING: 'revealing',
    TRIGGER: 'trigger',
    GAME_OVER: 'game_over',
  },

  EVENTS: {
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    ROOM_START: 'room:start',
    ROOM_READY: 'room:ready',
    ROOM_LEAVE: 'room:leave',

    GAME_DEAL: 'game:deal',
    GAME_PLAY_CARDS: 'game:playCards',
    GAME_CALL_LIAR: 'game:callLiar',
    GAME_ACCEPT_PLAY: 'game:acceptPlay',
    GAME_TRIGGER: 'game:trigger',
    GAME_OVER: 'game:over',

    GAME_STATE: 'game:state',
    ERROR: 'error',
  },

  SCREEN: {
    WIDTH: 1280,
    HEIGHT: 720,
  },
};
