import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/gameSocket',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private logger: Logger = new Logger('GameGateway');
  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
  ) {}

  handleConnection() {
    this.logger.log('Socket connected');
  }

  handleDisconnect(client: Socket) {
    this.gameService.disconnect(client);
  }

  @SubscribeMessage('joinGame')
  async joinGame(client: Socket, payload: any) {
    const token = this.jwtService.verify(payload.token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    this.gameService.connect(client, token.idPlayer, payload.type);
  }

  @SubscribeMessage('movePaddle')
  handleMovePaddle(socket: Socket, payload: any): void {
    this.gameService.movePaddle(socket, payload);
  }

  @SubscribeMessage('challenge')
  challengePlayer(socket: Socket, payload: any) {
    const token = this.jwtService.verify(payload.token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    this.gameService.challenge(
      socket,
      token.idPlayer,
      payload.id_challenged,
      payload.type,
    );
  }
}
