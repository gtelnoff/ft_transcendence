export enum NotifClientEndpoints {
  CLIENT_STATUS = 'clientStatus',
  NEW_NOTIFICATION = 'newNotification',
  DELETE_NOTIFICATION = 'deleteNotification',
  UPDATE_PLAYER_STATUS = 'updatePlayerStatus',
}

export enum NotifServerEndpoints {
  ADD_CLIENT = 'addClientToPlayer',
  GET_STATUS = 'getPlayerStatus',
  WATCH_PLAYER_STATUS = 'watchPlayerStatus',
  ADD_FRIEND = 'addFriend',
  CANCEL_FRIEND = 'cancelFriend',
  ADD_CHALLENGE = 'addChallenge',
  REFUSE_CHALLENGE = 'refuseChallenge',
  GET_ALL_NOTIF = 'getAllNotifications',
  DELETE_NOTIF = 'deleteNotifications',
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
