# Liar's Bar

Multiplayer party game combining Liar's Deck bluffing with Russian Roulette mechanics.

## Overview

Players play cards face-down and declare they match the table type. Opponents can call "LIAR" to force a showdown. If caught lying, you face Russian Roulette. The Devil Card variant adds extra danger - when revealed, ALL players must face roulette!

**Goal:** Be the last player standing.

## Tech Stack

- **Desktop Wrapper:** Electron
- **Networking:** Socket.io
- **Server:** Node.js + Express
- **Frontend UI:** React + TailwindCSS (via Vite)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm

### Installation

```bash
# Clone or enter the project directory
cd roulette-quiz

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Go back to root
cd ..
```

### Running the Game

**Development mode (recommended):**

```bash
npm run dev
```

This starts both the server and client concurrently using `concurrently`.

**Run separately:**

- **Server:** `npm run server:start` (Runs on `http://localhost:3000`)
- **Client:** `cd client && npm run dev` (Runs on `http://localhost:5173`)

## Playing the Game

1. Start both the client and server.
2. In the game menu, you can select **ONLINE**, **LAN**, or **BOT**.
3. Click **Create Room** to get a room code.
4. Share the room code with your opponent.
5. The opponent selects **JOIN ROOM** and enters the code.
6. Once both players click **READY**, the game begins.

## Game Rules

### Setup
- 2-4 players
- Each player starts with a hand of 5 cards
- A 20-card deck: 6 King, 6 Queen, 6 Ace, 2 Joker
- One card type is randomly selected as the "table type" each round

### Card Types
- **King** (Blue): Matches King's Table
- **Queen** (Purple): Matches Queen's Table
- **Ace** (Red): Matches Ace's Table
- **Joker** (Green): Wild card, matches any table
- **Devil Card**: One Joker marked as Devil - when called LIAR, ALL players face roulette!

### Gameplay
1. On your turn, play 1-3 cards face-down
2. Declare they match the current table type
3. The next player can **ACCEPT** (trust you) or **CALL LIAR**
4. If ACCEPT: they take their turn
5. If CALL LIAR: cards are revealed
6. If any card doesn't match (and isn't a Joker): the liar faces roulette
7. If all cards match: the caller faces roulette
8. **Devil Card special**: If a Devil Card is revealed, the owner AND all other players face roulette

### Russian Roulette
- 6-chamber revolver with 1 bullet
- Each pull advances the cylinder
- Survived: New round with fresh cards
- Dead: Player eliminated
- Last player standing wins

### Empty Hand
- If you play all your cards safely, you skip turns until the round ends
- If only one player has cards left, the next player is forced to call

## Project Structure

```
roulette-quiz/
├── client/                 # React client
│   ├── src/
│   │   ├── components/    # React UI components
│   │   ├── network/       # Socket.io client wrapper
│   │   ├── hooks/         # Bot game logic
│   │   └── audio/         # Procedural sound effects
│   ├── public/            # Static assets
│   └── index.html
├── server/                 # Node.js + Express + Socket.io server
│   ├── src/
│   │   ├── index.ts       # Main server entry
│   │   ├── GameManager.ts
│   │   ├── RoomManager.ts
│   │   └── DeckManager.ts
│   └── data/
├── shared/                 # Shared constants between client and server
└── docs/                   # Design specs and documentation
```

## License

MIT
