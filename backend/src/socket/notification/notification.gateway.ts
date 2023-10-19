import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'http';
import { Socket } from 'socket.io';
import { NotifServerEndpoints } from './notification.config';
import { NotificationSocketService } from './notification.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/mainSocket',
})
export class NotificationGateway {
  @WebSocketServer() server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private jwtService: JwtService,
    private readonly socketService: NotificationSocketService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log('Socket connected');

    client.emit('connected');
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Socket disconnected');
    this.socketService.disconnect(client);
  }

  @SubscribeMessage(NotifServerEndpoints.ADD_CLIENT)
  handleAddClientToPlayer(client: any, payload: any): void {
    if (!payload.token) {
      return;
    }
    const token = this.jwtService.verify(payload.token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    this.socketService.addClientToPlayer(client, token.idPlayer);
  }

  @SubscribeMessage(NotifServerEndpoints.GET_STATUS)
  handleCheckPlayerStatus(client: Socket, payload: any) {
    const token = this.jwtService.verify(payload.token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const status = this.socketService.checkPlayerStatusById(token.idPlayer);
    client.emit('  playerStatus', status);
  }

  @SubscribeMessage(NotifServerEndpoints.ADD_FRIEND)
  addFriendNotification(client: Socket, payload: any) {
    this.socketService.addFriend(client, payload.id_invited);
  }

  @SubscribeMessage(NotifServerEndpoints.CANCEL_FRIEND)
  cancelFriendNotification(client: Socket, payload: any) {
    this.socketService.cancelFriend(client, payload.id_invited);
  }

  @SubscribeMessage(NotifServerEndpoints.ADD_CHALLENGE)
  addChallengeNotification(client: Socket, payload: any) {
    this.socketService.addChallenge(
      client,
      payload.id_challenged,
      payload.gameType,
    );
  }

  @SubscribeMessage(NotifServerEndpoints.REFUSE_CHALLENGE)
  refuseChallenge(client: Socket, payload: any) {
    this.socketService.refuseChallenge(client, payload.id_challenger);
  }

  @SubscribeMessage(NotifServerEndpoints.GET_ALL_NOTIF)
  getAllNotifications(client: Socket) {
    this.socketService.getAllNotifications(client);
  }

  @SubscribeMessage(NotifServerEndpoints.DELETE_NOTIF)
  deleteNotification(client: Socket, payload: any) {
    this.socketService.deleteNotification(client, payload.id_notif);
  }

  @SubscribeMessage(NotifServerEndpoints.WATCH_PLAYER_STATUS)
  watchPlayerStatus(client: Socket, payload: any) {
    this.socketService.watchPlayer(client, payload.idPlayer);
  }
}
