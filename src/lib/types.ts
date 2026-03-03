export type PlayerIndex = 0 | 1;

export interface PlayedCard {
  id: string;
  name: string;
  set: string;
  treatment: string;
  price: number;
  notCounted?: boolean;
}

export interface LastPlay {
  playerIndex: PlayerIndex;
  card: {
    name: string;
    set: string;
    treatment: string;
    price: number;
  };
}

export interface GameState {
  target: number;
  remaining: number | { "0": number; "1": number };
  playerCards: {
    "0": PlayedCard[];
    "1": PlayedCard[];
  };
  currentTurn: PlayerIndex;
  status: "waiting" | "playing" | "finished";
  winner: PlayerIndex | null;
  usedCardIds?: string[];
  lastPlay?: LastPlay;
}

export interface GameConfig {
  target: number;
}

export interface Player {
  id: string;
  index: PlayerIndex;
}

export interface RoomState extends GameState {
  id: string;
  players: Player[];
}

export interface MatchConfig {
  target?: number;
  random?: boolean;
}

export type AiStrategy = "simple" | "smart";

export interface CardPlay {
  cardId: string;
  treatment: string;
}

