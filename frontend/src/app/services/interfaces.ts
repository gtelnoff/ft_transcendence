export interface Player {
  id: number;
  login: string;
  username: string;
  avatar_path: string;
  jwt_token: string;
  last_connection: string;
  two_factor_auth: boolean;
  online: boolean;
  classic_elo: number;
  classic_wins: number;
  classic_losses: number;
  custom_elo: number;
  custom_wins: number;
  custom_losses: number;
  id_active_trophy: number;
}

export interface PlayerStatus {
  id: number;
  status: string;
}

export enum MessageType {
  TEXT = "TEXT",
  JOIN = "JOIN",
  LEFT = "LEFT",
  KICK = "KICK",
  BAN = "BAN",
  MUTE = "MUTE",
  INVITE = "INVITE",
}

export class ChannelMessage {
  id: number;
  id_channel: number;
  id_player: number;
  content: string;
  time_posted: Date;
  name: string;
  avatar_path: string;
}

export enum GameType {
  CLASSIC = 0,
  CUSTOM = 1,
}

export enum MatchResult {
  P1_WIN = "P1_WIN",
  P2_WIN = "P2_WIN",
  DRAW = "DRAW",
}

export interface Match {
  id: number;
  id_player1: number;
  id_player2: number;
  player1: Player;
  player2: Player;
  time_started: Date;
  time_ended: Date;
  score_p1: number;
  score_p2: number;
  elochange_p1: number;
  elochange_p2: number;
  classic_game: boolean;
  result: MatchResult;
}

export class ChannelPlayer {
  id_channel: number;
  id_player: number;
  admin: boolean;
  time_muted_until: Date;
  time_banned_until: Date;
  channel: Channel;
  player: Player;
  channelMessages: ChannelMessage[];
}

export interface IPlayerPublicInfo {
  id: number;
  login: string;
  username: string;
  avatar_path: string;
  two_factor_auth?: boolean;
  classic_elo: number;
  classic_wins: number;
  classic_losses: number;
  custom_elo: number;
  custom_wins: number;
  custom_losses: number;
  is_the_user: boolean;
}

export interface IPlayerMatchInfo {
  id: number;
  username: string;
  avatar_path: string;
  elo: number;
  wins: number;
  losses: number;
  score: number;
  elochange?: number;
}

export interface Channel {
  id: number;
  id_owner: number;
  name: string;
  private: boolean;
  is_direct: boolean;
}

export interface ChannelUsers {
  id: number;
  login: string;
  username: string;
  is_owner: boolean;
  admin: boolean;
  status?: string;
}

export interface Friends {
  id_player: number;
  id_invited: number;
  player?: Player;
  invited?: Player;
  accepted: boolean;
  time_accepted: Date;
  time_deleted: Date;
}

export interface BlockedPlayer {
  id_player: number;
  id_blocked: number;
  player?: Player;
  blocked?: Player;
  time_blocked: Date;
}

export enum NotifType {
  MSG = "MSG",
  CHALLENGE = "CHALLENGE",
  FRIEND = "FRIEND",
}

export interface PlayerNotif {
  id: number;
  id_player: number;
  player: Player;
  time_sent: Date;
  type: NotifType;
  id_challenger?: number;
  gameType?: GameType;
  challenger?: Player;
  id_friend?: number;
  friend?: Player;
  id_channel?: number;
  nb_new_messages?: number;
}

export interface IFriend {
  id: number;
  login: string;
  username: string;
  avatarPath: string;
}

export interface GlobalError {
  id: number;
  message: string;
  deleteCallback: any;
}

export interface AddChannelUser {
  user: ChannelUsers;
  channelID: number;
}

export interface RemoveChannelUser {
  user: number;
  channelID: number;
}
