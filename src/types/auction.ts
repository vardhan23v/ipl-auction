import type { AuctionState, PlayingRole, PlayerStatus } from "@prisma/client";

export interface TeamSnapshot {
  id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; ownerName: string | null;
  purse: number; spent: number; squadCount: number; maxSquad: number; overseasCount: number; maxOverseas: number; rtmTotal: number; rtmUsed: number;
}
export interface PlayerSnapshot {
  id: string; name: string; photoUrl: string | null; role: PlayingRole; nationality: string; overseas: boolean; capped: boolean; set: string;
  basePrice: number; rating: number | null; status: PlayerStatus; matches: number; runs: number; wickets: number;
  average: number | null; strikeRate: number | null; economy: number | null; highScore: string | null; bestBowling: string | null;
  previousTeamId: string | null; previousTeamName: string | null; previousTeamAbbr: string | null;
  /** The previous team can still RTM this player right now (cards left, purse, squad room). */
  rtmAvailable: boolean;
}
export interface BidSnapshot { id: string; teamId: string; teamName: string; abbreviation: string; color: string; amount: number; kind: string; createdAt: string }
export interface RtmSnapshot {
  teamId: string; teamName: string; teamAbbr: string; teamColor: string;
  bidderTeamId: string; bidderTeamName: string; bidderTeamAbbr: string; bidderTeamColor: string;
  finalAmount: number; deadlineAt: number | null;
}
export interface AuctionSnapshot {
  state: AuctionState;
  currentPlayer: PlayerSnapshot | null;
  currentBid: number;
  highestTeamId: string | null;
  highestTeamName: string | null;
  timerEndsAt: number | null;
  timerRemainingMs: number | null;
  timerRunning: boolean;
  timerSeconds: number;
  rtmTimerSeconds: number;
  bidIncrement: number;
  autoSell: boolean;
  rtm: RtmSnapshot | null;
  teams: TeamSnapshot[];
  bids: BidSnapshot[];
  playersRemaining: number;
  totalPlayers: number;
  soldCount: number;
  unsoldCount: number;
  serverTime: number;
  version: number;
}

export const SOCKET_EVENTS = [
  "auction:started", "auction:paused", "auction:resumed", "auction:completed",
  "player:started", "player:sold", "player:unsold", "player:skipped", "player:next",
  "bid:placed", "bid:accepted", "bid:rejected", "timer:updated",
  "rtm:offer", "rtm:raise", "rtm:match", "rtm:passed",
  "team:purseUpdated", "team:squadUpdated", "auction:undo", "state:sync",
] as const;
export type SocketEvent = typeof SOCKET_EVENTS[number];

export const CONTROL_ACTIONS = [
  "START_AUCTION", "PAUSE", "RESUME", "COMPLETE", "RESET_AUCTION",
  "START_PLAYER", "START_TIMER", "PAUSE_TIMER", "RESET_TIMER",
  "SELL", "UNSOLD", "SKIP", "NEXT", "UNDO", "REQUEUE", "SHUFFLE",
] as const;
export type ControlAction = typeof CONTROL_ACTIONS[number];

export const RTM_ACTIONS = ["RTM_USE", "RTM_PASS", "RTM_RAISE", "RTM_KEEP", "RTM_MATCH", "RTM_DECLINE"] as const;
export type RtmAction = typeof RTM_ACTIONS[number];
