# MTG Money Game

A web game where players take turns naming Magic: The Gathering cards to subtract their prices from a target amount. Reach exactly $0 to win!

## Features

- **Practice Mode** – Play against AI (simple or smart difficulty)
- **Create Game** – Create a room and share the link with a friend
- **Find Opponent** – Join the matchmaking queue to play with a random opponent

## Rules

- Target amount: $350–$1000 (configurable by host)
- Players take turns naming MTG cards
- Card prices are rounded to the nearest dollar
- Cards cannot be repeated
- Must reach exactly $0 to win
- If a card would make the total go below 0, the play is rejected and you lose your turn
- Prices are hidden until you select a card and printing

## Tech Stack

- Next.js 14 (App Router)
- Socket.io (real-time multiplayer)
- Scryfall API (card data and prices)
- Tailwind CSS

## Development

```bash
npm install
npm run dev
```

Runs the custom server at [http://localhost:3000](http://localhost:3000).

## Deployment (Railway)

1. Connect your repo to Railway
2. Build command: `npm run build`
3. Start command: `node server.js`
4. Railway auto-injects `PORT` – the server binds to it

## Card Treatments

Supports different card treatments: Nonfoil, Foil, Etched, and Glossy. Each printing (edition) has its own price.
