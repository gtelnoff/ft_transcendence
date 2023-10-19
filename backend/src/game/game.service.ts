import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { MatchService } from 'src/match/match.service';
import { PlayerService } from 'src/player/player.service';
import { Game } from './game.class';
import {
  IPlayerInQueue,
  GameType,
  gameDebugMode,
  gameParameters,
  ClientEndpoints,
  IGameParameters,
  IPlayerChallenge,
} from './game.config';
import { GamePlayer } from './game.logic.class';
import { NotificationSocketService } from 'src/socket/notification/notification.service';

@Injectable()
export class GameService implements OnModuleInit {
  constructor(
    private readonly playerService: PlayerService,
    @Inject(forwardRef(() => NotificationSocketService))
    private readonly notificationService: NotificationSocketService,
    private readonly matchService: MatchService,
  ) {}

  private logger: Logger = new Logger('GameService');

  private baseRange = 50;
  private rangeGrowth = 30;

  private playerQueue: Map<number, IPlayerInQueue>[] = [];
  private playerChallengeQueue = new Map<number, IPlayerChallenge>();
  private playerToGame = new Map<number, Game>();
  private socketToPlayerMap = new Map<string, number>();

  // Even if we currently don't make use of it, it's never a bad idea to store it
  private matchmakingInterval: NodeJS.Timeout;

  onModuleInit() {
    this.playerQueue[GameType.CLASSIC] = new Map<number, IPlayerInQueue>();
    this.playerQueue[GameType.CUSTOM] = new Map<number, IPlayerInQueue>();
    this.matchmakingInterval = setInterval(() => this.matchmaking(), 1000);
  }

  public isPlayerInGame(idPlayer: number): boolean {
    return this.playerToGame.has(idPlayer);
  }

  /***************************************\
  *            Matchmaking              *|
  \***************************************/

  i = 0;

  public matchmaking() {
    this.matchPlayersInQueue(GameType.CLASSIC);
    this.matchPlayersInQueue(GameType.CUSTOM);

    if (this.i == 5 && gameDebugMode) {
      this.logger.log(
        'Queue for Classic : ' +
          this.playerQueue[GameType.CLASSIC].size +
          ', Custom : ' +
          this.playerQueue[GameType.CUSTOM].size,
      );
      this.logger.log('Active games : ' + this.playerToGame.size);
      this.logger.log('Socket connected : ' + this.socketToPlayerMap.size);
      this.i = 0;
    }
    ++this.i;
  }

  private async matchPlayersInQueue(type: GameType) {
    let idP1: number;
    let idP2: number;
    let p1: IPlayerInQueue;
    let p2: IPlayerInQueue;
    let range: number;
    let minIteration: number;
    let skip: boolean;

    for (idP1 of this.playerQueue[type].keys()) {
      p1 = this.playerQueue[type].get(idP1);
      p1.iteration += 1;

      skip = true;
      for (idP2 of this.playerQueue[type].keys()) {
        if (skip) {
          if (idP2 == idP1) {
            skip = false;
          }
          continue;
        }

        p2 = this.playerQueue[type].get(idP2);

        range = Math.abs(
          p1.gamePlayer.publicInfos.elo - p2.gamePlayer.publicInfos.elo,
        );
        minIteration = Math.min(p1.iteration, p2.iteration);
        this.logger.log(
          'Trying to match player ' +
            p1.gamePlayer.id +
            ' and ' +
            p2.gamePlayer.id,
        );
        this.logger.log('Range ' + range + ', minIteration ' + minIteration);
        if (range < this.baseRange + this.rangeGrowth * minIteration) {
          this.logger.log('Match succesful');
          // Match succesful !
          this.startNewGame(p1.gamePlayer, p2.gamePlayer, type);
          this.playerQueue[type].delete(idP1);
          this.playerQueue[type].delete(idP2);
        }
      }
    }
  }

  /***************************************\
  *            Challenge                *|
  \***************************************/

  public async challenge(
    client: Socket,
    id_player: number,
    id_challenged: number,
    type: GameType,
  ) {
    this.logger.log(
      id_player + ' is challening ' + id_challenged + ' to type ' + type,
    );
    const player = await this.createNewPlayer(client, id_player, type);

    const waiting = this.playerChallengeQueue.get(id_challenged);
    if (waiting && waiting.id_challenged == id_player && waiting.type == type) {
      this.startNewGame(waiting.gamePlayer, player, waiting.type);
      this.playerChallengeQueue.delete(waiting.gamePlayer.id);
    } else {
      this.playerChallengeQueue.set(id_player, {
        gamePlayer: player,
        id_challenged: id_challenged,
        type: type,
      });
    }
  }

  public async cancelChallenge(id_canceller: number, id_otherplayer: number) {
    let waiting = this.playerChallengeQueue.get(id_canceller);
    if (waiting) {
      // Means the player initiating the cancel is the challenger
      this.notificationService.cancelChallenge(id_canceller, id_otherplayer);
      this.playerChallengeQueue.delete(waiting.gamePlayer.id);
    } else {
      // The other way around
      waiting = this.playerChallengeQueue.get(id_otherplayer);
      if (waiting) {
        this.playerChallengeQueue.delete(waiting.gamePlayer.id);
        waiting.gamePlayer.socket.emit(ClientEndpoints.END, -1);
      }
    }
  }

  /***************************************\
  |*        Client discussion            *|
  \***************************************/

  public async connect(client: Socket, idPlayer: number, type: GameType) {
    if (!idPlayer) {
      this.logger.log("Token doesn't contain idPlayer.");
      client.disconnect();
    }

    const game = this.playerToGame.get(idPlayer);
    let player: GamePlayer;
    if (game) {
      this.logger.log('Game found');
      player = game.getGamePlayer(idPlayer);
      player.socket = client;
      this.sendInitialState(
        player.socket,
        true,
        gameParameters[game.getType()],
      );
      if ((await game.join(player)) && game.isReadyToStart()) {
        game.start();
      }

      this.socketToPlayerMap.set(client.id, player.id);
      player.socket.emit(ClientEndpoints.PLAYER_INFO, player.publicInfos);
    } else {
      if (type == undefined) {
        this.logger.log(
          'No active game found, a type of game is needed to join the matchmaking',
        );
        client.disconnect();
      }
      player = await this.createNewPlayer(client, idPlayer, type);
      this.playerQueue[type].set(player.id, {
        gamePlayer: player,
        iteration: 0,
        type,
      });
    }
  }

  public async disconnect(client: Socket) {
    this.logger.log('Socket disconnected');
    const idPlayer = this.socketToPlayerMap.get(client.id);
    this.socketToPlayerMap.delete(client.id);
    const game = this.playerToGame.get(idPlayer);
    if (game) {
      game.leave(client);
    } else {
      this.playerQueue[GameType.CLASSIC].delete(idPlayer);
      this.playerQueue[GameType.CUSTOM].delete(idPlayer);
      const waiting = this.playerChallengeQueue.get(idPlayer);
      if (waiting) {
        this.cancelChallenge(waiting.gamePlayer.id, waiting.id_challenged);
      }
    }
  }

  public async movePaddle(client: Socket, payload: any) {
    if (!payload?.y) {
      this.logger.log('Payload missing information for moving');
      return;
    }
    const idPlayer = this.socketToPlayerMap.get(client.id);
    if (!idPlayer) {
      this.logger.log(`Player connexion not found for socket ${client.id}`);
    }
    const game = this.playerToGame.get(idPlayer);
    if (!game) {
      this.logger.log(`Couldn\'t find an active game for socket ${client.id}`);
    }
    game.movePaddle(idPlayer, payload.y);
  }

  public async startNewGame(
    player1: GamePlayer,
    player2: GamePlayer,
    type: GameType,
  ) {
    const game = new Game(
      this.playerService,
      this.matchService,
      this.logger,
      type,
    );
    game.endGameHook = () => {
      this.playerToGame.delete(player1.id);
      this.playerToGame.delete(player2.id);
    };

    await game.join(player1);
    await game.join(player2);
    game.start();
    this.playerToGame.set(player1.id, game);
    this.playerToGame.set(player2.id, game);
  }

  public async createNewPlayer(
    client: Socket,
    id_player: number,
    type: GameType,
  ): Promise<GamePlayer> {
    const player = new GamePlayer();
    player.id = id_player;
    player.socket = client;
    player.entity = await this.playerService.findById(player.id);
    player.publicInfos = this.playerService.getPlayerModeInfo(
      type,
      player.entity,
    );

    this.sendInitialState(player.socket, true, gameParameters[type]);
    player.socket.emit(ClientEndpoints.PLAYER_INFO, player.publicInfos);
    this.socketToPlayerMap.set(client.id, player.id);

    return player;
  }

  private sendInitialState(
    socket: Socket,
    isPlayerOne: boolean,
    parameters: IGameParameters,
  ) {
    if (isPlayerOne) {
      this.logger.log('Sending initial state');
      socket.emit(ClientEndpoints.INITIAL_STATE, {
        fieldWidth: parameters.fieldWidth,
        fieldHeight: parameters.fieldHeight,
        playerPaddleList: parameters.p1PaddleList.map((paddle) => {
          return {
            position: paddle.position,
            halfWidth: paddle.halfWidth,
            halfHeight: paddle.halfHeight,
          };
        }),
        enemyPaddleList: parameters.p2PaddleList.map((paddle) => {
          return {
            position: paddle.position,
            halfWidth: paddle.halfWidth,
            halfHeight: paddle.halfHeight,
          };
        }),
        ballList: parameters.ballList.map((ball) => {
          return { position: ball.position, radius: ball.radius };
        }),
      });
    } else {
      socket.emit(ClientEndpoints.INITIAL_STATE, {
        fieldWidth: parameters.fieldWidth,
        fieldHeight: parameters.fieldHeight,
        playerPaddleList: parameters.p2PaddleList.map((paddle) => {
          return {
            position: {
              x: parameters.fieldWidth - paddle.position.x,
              y: paddle.position.y,
            },
            halfWidth: paddle.halfWidth,
            halfHeight: paddle.halfHeight,
          };
        }),
        enemyPaddleList: parameters.p1PaddleList.map((paddle) => {
          return {
            position: {
              x: parameters.fieldWidth - paddle.position.x,
              y: paddle.position.y,
            },
            halfWidth: paddle.halfWidth,
            halfHeight: paddle.halfHeight,
          };
        }),
        ballList: parameters.ballList.map((ball) => {
          return {
            position: {
              x: parameters.fieldWidth - ball.position.x,
              y: ball.position.y,
            },
            radius: ball.radius,
          };
        }),
      });
    }
  }
}
