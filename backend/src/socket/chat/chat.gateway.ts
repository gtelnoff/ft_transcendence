import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Server } from 'http';
import { ChatService } from './chat.service';
import { ChatServerEndpoints } from './chat.config';
import { NotificationSocketService } from '../notification/notification.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chatSocket',
})
export class ChatGateway {
  @WebSocketServer() server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly socketService: NotificationSocketService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log('Socket connected');

    client.emit('connected');
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Socket disconnected');
    this.socketService.clearPlayersWatched(client);
    this.chatService.disconnect(client);
  }

  @SubscribeMessage(ChatServerEndpoints.IDENTIFICATION)
  identification(client: Socket, payload: any) {
    const token = this.jwtService.verify(payload.token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    this.chatService.identification(client, token.idPlayer);
  }

  @SubscribeMessage(ChatServerEndpoints.GET_FRIEND_STATUS)
  handleCheckFriendStatus(client: Socket, payload: any) {
    const status = this.socketService.checkPlayerStatusById(
      payload.id_to_check,
    );

    client.emit('updateFriendStatus', status);
  }

  @SubscribeMessage(ChatServerEndpoints.WATCH_PLAYER_STATUS)
  watchPlayerStatus(client: Socket, payload: any) {
    this.socketService.watchPlayer(client, payload.idPlayer);
  }

  @SubscribeMessage(ChatServerEndpoints.UNWATCH_PLAYER_STATUS)
  unwatchPlayerStatus(client: Socket, payload: any) {
    this.socketService.unwatchPlayer(client, payload.idPlayer);
  }

  @SubscribeMessage(ChatServerEndpoints.GET_ALL_CHANNELS)
  getAllChannels(client: Socket) {
    this.chatService.getAllChannels(client);
  }

  @SubscribeMessage(ChatServerEndpoints.CREATE_DIRECT_CHANNEL)
  createDirectChannel(client: Socket, payload: any) {
    if (!payload.user) {
      return;
    }
    this.chatService.createDirectChannel(client, payload.user);
  }

  @SubscribeMessage(ChatServerEndpoints.CREATE_INDIRECT_CHANNEL)
  createIndirectChannel(client: Socket, payload: any) {
    if (!payload.name) {
      return;
    }
    this.chatService.createIndirectChannel(client, payload.name);
  }

  @SubscribeMessage(ChatServerEndpoints.JOIN_CHANNEL)
  joinChannel(client: Socket, payload: any) {
    if (!payload.channelID) {
      return;
    }
    this.chatService.joinChannel(client, payload.channelID, payload.password);
  }

  @SubscribeMessage(ChatServerEndpoints.KICK_USER)
  kickUser(client: Socket, payload: any) {
    if (!payload.channelID || !payload.user) {
      return;
    }
    this.chatService.kickUser(client, payload.user, payload.channelID);
  }

  @SubscribeMessage(ChatServerEndpoints.BAN_USER)
  banUser(client: Socket, payload: any) {
    if (!payload.channelID || !payload.user) {
      return;
    }
    this.chatService.banUser(client, payload.user, payload.channelID);
  }

  @SubscribeMessage(ChatServerEndpoints.INVITE_USER)
  inviteUser(client: Socket, payload: any) {
    if (!payload.channelID || !payload.user) {
      return;
    }
    this.chatService.inviteUser(client, payload.user, payload.channelID);
  }

  /////////////////// MESSAGES //////////////////////

  @SubscribeMessage(ChatServerEndpoints.GET_ALL_MESSAGES)
  getAllMessages(client: Socket, payload: any) {
    this.chatService.getChannelMessages(client, payload.id_channel);
  }

  @SubscribeMessage(ChatServerEndpoints.SEND_MESSAGE)
  sendMessage(client: Socket, message: any) {
    this.chatService.sendMessage(client, message);
  }
}
