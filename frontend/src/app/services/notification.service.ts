import { Injectable, ChangeDetectorRef } from "@angular/core";
import { io } from "socket.io-client";
import { CookieService } from "ngx-cookie-service";
import { BehaviorSubject } from "rxjs";
import { GameType, PlayerNotif, PlayerStatus } from "./interfaces";

enum ClientEndpoints {
  FRIEND_STATUS = "friendStatus",
  CLIENT_STATUS = "clientStatus",
  NEW_NOTIFICATION = "newNotification",
  DELETE_NOTIFICATION = "deleteNotification",
  UPDATE_CHANNEL_LIST = "updateChannelList",
  NEW_MESSAGE = "newMessage",
  UPDATE_CHANNEL_MESSAGES = "updateChannelMessages",
  UPDATE_PLAYER_STATUS = "updatePlayerStatus",
  NEW_CHANNEL = "newChannel",
  REMOVE_CHANNEL = "removeChannel",
  ADD_CHANNEL_USER = "addChannelUser",
  REMOVE_CHANNEL_USER = "removeChannelUser",
}

enum ServerEndpoints {
  ADD_CLIENT = "addClientToPlayer",
  GET_STATUS = "getPlayerStatus",
  ADD_FRIEND = "addFriend",
  GET_FRIEND_STATUS = "getFriendStatus",
  GET_PROFILE_STATUS = "getProfileStatus",
  WATCH_PLAYER_STATUS = "watchPlayerStatus",
  UNWATCH_PLAYER_STATUS = "unwatchPlayerStatus",
  CANCEL_FRIEND = "cancelFriend",
  ADD_CHALLENGE = "addChallenge",
  REFUSE_CHALLENGE = "refuseChallenge",
  GET_ALL_NOTIF = "getAllNotifications",
  DELETE_NOTIF = "deleteNotifications",
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private mainSocket: any;
  private playerStatusSubject = new BehaviorSubject<string | undefined>(
    undefined
  );
  playerStatus$ = this.playerStatusSubject.asObservable();
  public socketConnected = false;
  public notifications: PlayerNotif[] = [];

  idPlayerToWatch: number | undefined;
  private initialized: boolean = false;
  public currentProfileStatus: PlayerStatus | undefined = undefined;

  constructor(private cookieService: CookieService) {}

  setupSocketConnection() {
    this.mainSocket = io(
      "ws://" + window.location.hostname + ":3000/mainSocket"
    );
    this.mainSocket.on("connected", (data: any) => {
      this.socketConnected = true;
      this.addClientToPlayer();
      if (!this.initialized) {
        this.subscribeToNotifications();
        this.subscribeToProfileStatusUpdates();
        this.initialized = true;
      }
      if (this.idPlayerToWatch) {
        this.watchPlayerStatus(this.idPlayerToWatch);
      }
    });
  }

  subscribeToProfileStatusUpdates() {
    this.mainSocket.on(
      ClientEndpoints.UPDATE_PLAYER_STATUS,
      (updatedProfileStatus: PlayerStatus) => {
        if (!updatedProfileStatus) return;
        this.currentProfileStatus = updatedProfileStatus;
      }
    );
  }

  destroySocketConnection() {
    if (this.mainSocket) {
      this.mainSocket.disconnect();
    }
  }

  addClientToPlayer() {
    this.mainSocket.emit(ServerEndpoints.ADD_CLIENT, {
      token: this.cookieService.get("jwtToken"),
    });
  }

  watchPlayerStatus(idPlayer: number) {
    if (this.socketConnected) {
      if (this.currentProfileStatus) {
        this.mainSocket.emit(ServerEndpoints.UNWATCH_PLAYER_STATUS, {
          idPlayer: idPlayer,
        });
      }
      this.mainSocket.emit(ServerEndpoints.WATCH_PLAYER_STATUS, {
        idPlayer: idPlayer,
      });
      this.idPlayerToWatch = undefined;
    } else {
      this.idPlayerToWatch = idPlayer;
    }
  }

  subscribeToNotifications() {
    this.mainSocket.on(
      ClientEndpoints.NEW_NOTIFICATION,
      (notification: PlayerNotif) => {
        this.notifications.push(notification);
      }
    );
    this.getNotifications();
  }

  getNotifications() {
    this.mainSocket.emit(ServerEndpoints.GET_ALL_NOTIF);
  }

  removeNotification(notification: PlayerNotif) {
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
    this.mainSocket.emit(ServerEndpoints.DELETE_NOTIF, {
      id_notif: notification.id,
    });
  }

  sendFriendNotification(id_invited: number) {
    this.mainSocket.emit(ServerEndpoints.ADD_FRIEND, {
      id_invited: id_invited,
    });
  }

  cancelFriendNotification(id_invited: number) {
    this.mainSocket.emit(ServerEndpoints.CANCEL_FRIEND, {
      id_invited: id_invited,
    });
  }

  sendChallengeNotification(id_challenged: number, gameType: GameType) {
    this.mainSocket.emit(ServerEndpoints.ADD_CHALLENGE, {
      id_challenged: id_challenged,
      gameType: gameType,
    });
  }

  refuseChallenge(id_challenger: number | undefined) {
    if (id_challenger == undefined) return;
    this.mainSocket.emit(ServerEndpoints.REFUSE_CHALLENGE, {
      id_challenger: id_challenger,
    });
  }
}
