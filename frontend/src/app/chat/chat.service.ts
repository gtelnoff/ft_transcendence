import { Injectable, ChangeDetectorRef } from "@angular/core";
import {
  Channel,
  ChannelMessage,
  ChannelUsers,
  AddChannelUser,
  RemoveChannelUser,
  Player,
  PlayerStatus,
} from "../services/interfaces";
import { Socket } from "socket.io-client";
import { CookieService } from "ngx-cookie-service";
import { BackendService } from "../services/backend.service";
import { lastValueFrom } from "rxjs";

enum ClientEndpoints {
  UPDATE_CHANNEL_LIST = "updateChannelList",
  NEW_MESSAGE = "newMessage",
  UPDATE_CHANNEL_MESSAGES = "updateChannelMessages",
  NEW_CHANNEL = "newChannel",
  REMOVE_CHANNEL = "removeChannel",
  ADD_CHANNEL_USER = "addChannelUser",
  REMOVE_CHANNEL_USER = "removeChannelUser",
  UPDATE_PLAYER_STATUS = "updatePlayerStatus",
}

enum ServerEndpoints {
  IDENTIFICATION = "identification",
  GET_ALL_CHANNELS = "getAllChannels",
  GET_ALL_MESSAGES = "getAllMessages",
  SEND_MESSAGE = "sendMessage",
  CREATE_DIRECT_CHANNEL = "createDirectChannel",
  CREATE_INDIRECT_CHANNEL = "createIndirectChannel",
  JOIN_CHANNEL = "joinChannel",
  KICK_USER = "kickUser",
  WATCH_PLAYER_STATUS = "watchPlayerStatus",
  UNWATCH_PLAYER_STATUS = "unwatchPlayerStatus",
  BAN_USER = "banUser",
  INVITE_USER = "inviteUser",
}

@Injectable({
  providedIn: "root",
})
export class ChatService {
  public user: Player;
  public channels: Channel[] = [];
  public publicChannels: Channel[] = [];
  public directChannels: Channel[] = [];
  public currentChannel: Channel | undefined;
  public currentChannelUser: ChannelUsers | undefined;
  public currentChannelMessages: ChannelMessage[] | undefined = [];
  public currentChannelUserList: ChannelUsers[] = [];

  constructor(
    private readonly cookieService: CookieService,
    private readonly backendService: BackendService
  ) {}

  /********************************************************************\
  |*                      Socket setup                                *|
  \********************************************************************/

  setupChatSocket(socket: Socket, cdr: ChangeDetectorRef) {
    socket.on("connected", () => {});
    this.subscribeToChannelsUpdate(socket, cdr);
    this.subscribeToNewChannel(socket, cdr);
    this.subscribeToRemoveChannel(socket, cdr);
    this.subscribeToRemoveChannelUser(socket, cdr);
    this.subscribeToAddUser(socket, cdr);
    this.subscribeToChannelMessages(socket, cdr);
    this.subscribeToChannelMessagesUpdate(socket, cdr);
    this.subscribeToPlayersStatusUpdates(socket, cdr);

    this.identification(socket);
    this.getAllChannels(socket);
    this.changeCurrentChannel(socket, undefined);
  }

  private subscribeToChannelsUpdate(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.UPDATE_CHANNEL_LIST).length)
      socket.on(
        ClientEndpoints.UPDATE_CHANNEL_LIST,
        (updatedChannelList: Channel[]) => {
          this.channels = [];
          this.channels = updatedChannelList;
          this.publicChannels = this.channels.filter(
            (channel) => !channel.is_direct
          );
          this.directChannels = this.channels.filter(
            (channel) => channel.is_direct
          );
          cdr.detectChanges();
        }
      );
  }

  private subscribeToNewChannel(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.NEW_CHANNEL).length)
      socket.on(ClientEndpoints.NEW_CHANNEL, (channel: Channel) => {
        if (!channel || this.channels.find((chan) => chan.id == channel.id))
          return;
        this.channels.push(channel);
        if (channel.is_direct) this.directChannels.push(channel);
        else this.publicChannels.push(channel);
        cdr.detectChanges();
      });
  }

  private subscribeToRemoveChannel(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.REMOVE_CHANNEL).length)
      socket.on(ClientEndpoints.REMOVE_CHANNEL, (channelID: number) => {
        if (!channelID) return;
        let index = this.publicChannels.findIndex(
          (channel) => channel.id === channelID
        );
        if (index >= 0) {
          this.publicChannels.splice(index, 1);
          if (this.currentChannel && this.currentChannel.id == channelID) {
            this.changeCurrentChannel(socket, undefined);
          }
        }
        cdr.detectChanges();
      });
  }

  private subscribeToRemoveChannelUser(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.REMOVE_CHANNEL_USER).length)
      socket.on(
        ClientEndpoints.REMOVE_CHANNEL_USER,
        (player: RemoveChannelUser) => {
          if (
            !this.currentChannel ||
            player.channelID != this.currentChannel.id
          )
            return;
          socket.emit(ServerEndpoints.UNWATCH_PLAYER_STATUS, {
            idPlayer: player.user,
          });
          const index = this.currentChannelUserList.findIndex(
            (channelUser) => channelUser.id == player.user
          );
          this.currentChannelUserList.splice(index, 1);
          cdr.detectChanges();
        }
      );
  }

  private subscribeToAddUser(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.ADD_CHANNEL_USER).length)
      socket.on(ClientEndpoints.ADD_CHANNEL_USER, (player: AddChannelUser) => {
        if (
          !this.currentChannel ||
          player.channelID != this.currentChannel.id ||
          this.currentChannelUserList.find((user) => user.id == player.user.id)
        )
          return;
        this.currentChannelUserList.push(player.user);
        socket.emit(ServerEndpoints.WATCH_PLAYER_STATUS, {
          idPlayer: player.user.id,
        });
        cdr.detectChanges();
      });
  }

  private subscribeToChannelMessages(socket: Socket, cdr: ChangeDetectorRef) {
    if (!socket.listeners(ClientEndpoints.NEW_MESSAGE).length)
      socket.on(ClientEndpoints.NEW_MESSAGE, (message: ChannelMessage) => {
        if (
          !this.currentChannel ||
          message.id_channel != this.currentChannel.id ||
          this.currentChannelMessages?.find(
            (existing) => existing.id == message.id
          )
        )
          return;
        if (this.currentChannelMessages == undefined) {
          this.currentChannelMessages = [];
        }
        message.time_posted = new Date(message.time_posted);
        this.currentChannelMessages.push(message);
        this.currentChannelMessages.sort((a, b) => {
          return a.time_posted.getTime() - b.time_posted.getTime();
        });
        cdr.detectChanges();
      });
  }

  private subscribeToChannelMessagesUpdate(
    socket: Socket,
    cdr: ChangeDetectorRef
  ) {
    if (!socket.listeners(ClientEndpoints.UPDATE_CHANNEL_MESSAGES).length)
      socket.on(
        ClientEndpoints.UPDATE_CHANNEL_MESSAGES,
        (updatedChannelMessages: ChannelMessage[]) => {
          if (updatedChannelMessages.length == 0) {
            this.currentChannelMessages = [];
            return;
          }
          if (updatedChannelMessages[0].id_channel != this.currentChannel?.id)
            return;
          this.currentChannelMessages = [];
          this.currentChannelMessages = updatedChannelMessages.map(
            (message) => ({
              ...message,
              time_posted: new Date(message.time_posted),
            })
          );
          this.currentChannelMessages.sort(
            (a, b) => a.time_posted.getTime() - b.time_posted.getTime()
          );
          cdr.detectChanges();
        }
      );
  }

  private subscribeToPlayersStatusUpdates(
    socket: Socket,
    cdr: ChangeDetectorRef
  ) {
    if (!socket.listeners(ClientEndpoints.UPDATE_PLAYER_STATUS).length)
      socket.on(
        ClientEndpoints.UPDATE_PLAYER_STATUS,
        (updatedPlayerStatus: PlayerStatus) => {
          if (!updatedPlayerStatus) return;
          const updatedPlayerIndex = this.currentChannelUserList.findIndex(
            (player) => {
              return player.id === updatedPlayerStatus.id;
            }
          );
          if (updatedPlayerIndex >= 0) {
            this.currentChannelUserList[updatedPlayerIndex].status =
              updatedPlayerStatus.status;
          }
          cdr.detectChanges();
        }
      );
  }

  /********************************************************************\
  |*                      Client calls                                *|
  \********************************************************************/

  async identification(socket: Socket) {
    socket.emit(ServerEndpoints.IDENTIFICATION, {
      token: this.cookieService.get("jwtToken"),
    });
  }

  getAllChannels(socket: Socket) {
    socket.emit(ServerEndpoints.GET_ALL_CHANNELS);
  }

  createDirectChannel(socket: Socket, user: string) {
    socket.emit(ServerEndpoints.CREATE_DIRECT_CHANNEL, {
      user: user,
    });
  }

  createIndirectChannel(socket: Socket, name: string) {
    socket.emit(ServerEndpoints.CREATE_INDIRECT_CHANNEL, {
      name: name,
    });
  }

  joinChannel(socket: Socket, channelID: number, password: string) {
    socket.emit(ServerEndpoints.JOIN_CHANNEL, {
      channelID: channelID,
      password: password,
    });
  }

  async kickUser(socket: Socket, id: number, channelID: number) {
    socket.emit(ServerEndpoints.KICK_USER, {
      token: this.cookieService.get("jwtToken"),
      channelID: channelID,
      user: id,
    });
  }

  async banUser(socket: Socket, id: number) {
    socket.emit(ServerEndpoints.BAN_USER, {
      channelID: this.currentChannel?.id,
      user: id,
    });
  }

  async inviteUser(socket: Socket, id: number) {
    socket.emit(ServerEndpoints.INVITE_USER, {
      channelID: this.currentChannel?.id,
      user: id,
    });
  }

  sendMessage(
    socket: Socket,
    id_channel: number,
    userId: number,
    message: string
  ) {
    socket.emit(ServerEndpoints.SEND_MESSAGE, {
      content: message,
      id_channel: id_channel,
      id_player: userId,
    });
  }

  ///////////////////////// MESSAGES ////////////////////////////
  async changeCurrentChannel(socket: Socket, channelId: number | undefined) {
    if (channelId == this.currentChannel?.id) {
      return;
    } else if (channelId == undefined) {
      this.currentChannel = undefined;
    } else {
      this.currentChannel = this.channels.find(
        (channel) => channel.id === channelId
      );
    }
    for (const chanUser of this.currentChannelUserList) {
      if (chanUser.id != this.user.id) {
        socket.emit(ServerEndpoints.UNWATCH_PLAYER_STATUS, {
          idPlayer: chanUser.id,
        });
      }
    }

    if (!this.currentChannel) {
      this.currentChannelUserList = [];
      this.currentChannelMessages = [];
      this.currentChannelUser = undefined;
      return;
    }

    this.currentChannelUserList = await lastValueFrom(
      this.backendService.get("/channel/channelUsers/" + channelId)
    );
    for (const chanUser of this.currentChannelUserList) {
      if (chanUser.id == this.user.id) {
        this.currentChannelUser = chanUser;
      } else {
        socket.emit(ServerEndpoints.WATCH_PLAYER_STATUS, {
          idPlayer: chanUser.id,
        });
      }
    }

    socket.emit(ServerEndpoints.GET_ALL_MESSAGES, {
      id_channel: channelId,
    });
  }
}
