export interface ChannelUsers {
  id: number;
  login: string;
  username: string;
  is_owner: boolean;
  admin: boolean;
}

export interface ExportString {
  string: string;
}

export interface IChannel {
  id: number;
  id_owner: number;
  name: string;
  private: boolean;
  is_direct: boolean;
}

export class IChannelMessage {
  id: number;
  id_channel: number;
  id_player: number;
  content: string;
  time_posted: Date;
  name?: string;
  avatar_path?: string;
}

export interface IChannelUsers {
  id: number;
  login: string;
  username: string;
  is_owner: boolean;
  admin: boolean;
}
