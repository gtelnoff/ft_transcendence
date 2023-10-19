export enum ChatClientEndpoints {
  FRIEND_STATUS = 'friendStatus',
  NEW_MESSAGE = 'newMessage',
  UPDATE_CHANNEL_LIST = 'updateChannelList',
  UPDATE_CHANNEL_MESSAGES = 'updateChannelMessages',
  UPDATE_PLAYER_STATUS = 'updatePlayerStatus',
  NEW_CHANNEL = 'newChannel',
  REMOVE_CHANNEL = 'removeChannel',
  ADD_CHANNEL_USER = 'addChannelUser',
  REMOVE_CHANNEL_USER = 'removeChannelUser',
}

export enum ChatServerEndpoints {
  IDENTIFICATION = 'identification',
  ADD_CLIENT = 'addClientToPlayer',
  WATCH_PLAYER_STATUS = 'watchPlayerStatus',
  UNWATCH_PLAYER_STATUS = 'unwatchPlayerStatus',
  GET_FRIEND_STATUS = 'getFriendStatus',
  GET_ALL_CHANNELS = 'getAllChannels',
  GET_ALL_MESSAGES = 'getAllMessages',
  SEND_MESSAGE = 'sendMessage',
  CREATE_DIRECT_CHANNEL = 'createDirectChannel',
  CREATE_INDIRECT_CHANNEL = 'createIndirectChannel',
  JOIN_CHANNEL = 'joinChannel',
  KICK_USER = 'kickUser',
  BAN_USER = 'banUser',
  INVITE_USER = 'inviteUser',
}

export interface PlayerStatus {
  id: number;
  status: string;
}
export interface ChannelMessage {
  id: number;
  id_channel: number;
  id_player: number;
  content: string;
}
