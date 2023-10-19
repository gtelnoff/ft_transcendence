import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { CreateMatchDTO } from 'src/match/dto/createMatch.dto';
import { UpdateMatchDTO } from 'src/match/dto/updateMatch.dto';
import { Match, MatchResult } from 'src/match/entities/match.entity';
import { MatchService } from 'src/match/match.service';
import { PlayerService } from 'src/player/player.service';
import { GameLogic, GamePlayer } from './game.logic.class';
import {
  ClientEndpoints,
  timeParameters,
  GameType,
  gameParameters,
  eloKFactor,
} from './game.config';
import { Player } from 'src/player/entities/player.entity';

export class Game {
  constructor(
    private readonly playerService: PlayerService,
    private matchService: MatchService,
    private readonly logger: Logger,
    private type: GameType,
  ) {}

  /***************************************\
   *        Game specific infos          *
  \***************************************/

  private logic = new GameLogic(gameParameters[this.type]);

  private started = false;
  private paused = false;
  private ended = false;

  private abortTimeout: NodeJS.Timeout;
  public endGameTimeout: NodeJS.Timeout;
  private resumeTimeout: NodeJS.Timeout;
  private gameInterval: NodeJS.Timeout;

  private gameTimeLeft: number = timeParameters.gameLength;
  private game_started: Date;
  private pause_started: Date;

  private lastPlayer: GamePlayer;
  private idMatch: number;

  private p1: GamePlayer;
  private p2: GamePlayer;

  public endGameHook?();

  /***************************************\
   *        Player connection handling   *
  \***************************************/
  public async join(player: GamePlayer): Promise<boolean> {
    let otherPlayer: GamePlayer;
    if (!this.p1) {
      this.p1 = player;
    } else if (!this.p2) {
      this.p2 = player;
    }

    if (this.p1.id == player.id) {
      player = this.p1;
      otherPlayer = this.p2;
    } else if (this.p2.id == player.id) {
      player = this.p2;
      otherPlayer = this.p1;
    }
    if (player.connected) {
      return false;
    }
    player.connected = true;
    player.socket.emit(ClientEndpoints.TIME_SYNC, await this.getTimeInfo());
    if (this.started == true) {
      player.socket.emit(
        ClientEndpoints.OPPONENT_INFO,
        otherPlayer.publicInfos,
      );
      player.socket.emit(
        ClientEndpoints.GAMESTATE,
        this.logic.getGamestate(player.id == this.p1.id),
      );
      if (!otherPlayer.connected) {
        this.lastPlayer = player;
      } else {
        return true;
      }
    }

    if (this.started == true || !this.p1 || !this.p2) {
      return false;
    }
    return true;
  }

  /** Returns true if the game can then be fully deleted */
  public async leave(socket: Socket) {
    const players = this.identifyPlayers(socket);
    if (!players) {
      return;
    }
    const player = players[0];
    const otherPlayer = players[1];
    this.logger.log(`Player ${player.id} left`);

    if (!this.started) {
      this.logger.log('Problem : someone left BEFORE the game is started');
      await this.end(true);
      return;
    }
    player.socket = undefined;
    player.connected = false;
    if (!this.paused && !this.ended) {
      if (otherPlayer.connected) {
        this.lastPlayer = otherPlayer;
      }
      await this.pause();
    }
  }

  public async start() {
    if (this.p1.socket && this.p2.socket) {
      this.logger.log('Game started');

      ////////////// FIRST START OF THE GAME ///////////////////
      if (this.started == false) {
        this.matchService = this.matchService;
        const dto: CreateMatchDTO = {
          id_player1: this.p1.id,
          id_player2: this.p2.id,
          ladder_game: false,
          classic_game: this.type == GameType.CLASSIC,
        };
        const matchPromise: Promise<Match> = this.matchService.createMatch(dto);
        this.p1.socket.emit(ClientEndpoints.OPPONENT_INFO, this.p2.publicInfos);
        this.p2.socket.emit(ClientEndpoints.OPPONENT_INFO, this.p1.publicInfos);

        this.logic.initializeState();
        this.started = true;

        this.idMatch = (await matchPromise).id;
      } else {
        ///////////////// RESTART AFTER PAUSE ///////////////////////////////
        this.paused = false;
        this.p1.socket.emit(
          ClientEndpoints.TIME_SYNC,
          await this.getTimeInfo(),
        );
        this.p2.socket.emit(
          ClientEndpoints.TIME_SYNC,
          await this.getTimeInfo(),
        );
        clearTimeout(this.abortTimeout);
      }
      //////////////////// COMMON CODE /////////////////////////////////////

      this.p1.socket.emit(ClientEndpoints.RESUME, timeParameters.resumeLength);
      this.p2.socket.emit(ClientEndpoints.RESUME, timeParameters.resumeLength);
      this.p1.socket.emit(
        ClientEndpoints.GAMESTATE,
        this.logic.getGamestate(true),
      );
      this.p2.socket.emit(
        ClientEndpoints.GAMESTATE,
        this.logic.getGamestate(false),
      );
      this.resumeTimeout = setTimeout(() => {
        this.game_started = new Date();
        this.endGameTimeout = setTimeout(() => {
          this.end(false);
        }, this.gameTimeLeft);
        this.gameInterval = setInterval(() => {
          this.gameLoop();
        }, 1000 / timeParameters.fps);
        this.p1.socket.emit(ClientEndpoints.START);
        this.p2.socket.emit(ClientEndpoints.START);
      }, timeParameters.resumeLength);
    }
  }

  public async pause() {
    this.paused = true;
    if (this.p1.connected) {
      this.p1.socket.emit(ClientEndpoints.PAUSE);
    }
    if (this.p2.socket) {
      this.p2.socket.emit(ClientEndpoints.PAUSE);
    }
    this.abortTimeout = setTimeout(() => {
      this.end(true);
    }, timeParameters.pauseLength);
    if (this.game_started != undefined) {
      this.gameTimeLeft =
        this.gameTimeLeft -
        (new Date().getTime() - this.game_started.getTime());
    }
    this.pause_started = new Date();
    clearTimeout(this.endGameTimeout);
    clearTimeout(this.resumeTimeout);
    clearInterval(this.gameInterval);
  }

  public async end(aborted: boolean) {
    clearTimeout(this.endGameTimeout);
    clearTimeout(this.resumeTimeout);
    clearTimeout(this.abortTimeout);
    clearInterval(this.gameInterval);

    this.ended = true;
    this.p1.score = this.logic.getPlayer1Score();
    this.p2.score = this.logic.getPlayer2Score();

    if (aborted) {
      this.logger.log('Game aborted');
    } else {
      this.logger.log('Game end');
    }
    if (this.started) {
      let result: MatchResult;

      if (aborted) {
        if (this.lastPlayer.id == this.p1.id) {
          result = MatchResult.P1_WIN;
        } else {
          result = MatchResult.P2_WIN;
        }
      } else {
        if (this.p1.score > this.p2.score) {
          result = MatchResult.P1_WIN;
        } else if (this.p1.score < this.p2.score) {
          result = MatchResult.P2_WIN;
        } else {
          result = MatchResult.DRAW;
        }
      }

      await this.updateDatabase(result);

      if (this.p1.connected) {
        this.p1.socket.emit(ClientEndpoints.END, this.idMatch);
      }
      if (this.p2.connected) {
        this.p2.socket.emit(ClientEndpoints.END, this.idMatch);
      }
    } else {
      if (this.p1.connected) {
        this.p1.socket.emit(ClientEndpoints.END);
      }
      if (this.p2.connected) {
        this.p2.socket.emit(ClientEndpoints.END);
      }
    }

    if (this.p1.socket) {
      this.p1.socket.disconnect();
    }
    if (this.p2.socket) {
      this.p2.socket.disconnect();
    }

    if (this.endGameHook) {
      this.endGameHook();
    }
  }

  private async updateDatabase(result: MatchResult) {
    this.logger.log('Starting database update');

    const player1: Player = await this.playerService.findById(this.p1.id);
    const player1Info = this.playerService.getPlayerModeInfo(
      this.type,
      player1,
    );
    const player2: Player = await this.playerService.findById(this.p2.id);
    const player2Info = this.playerService.getPlayerModeInfo(
      this.type,
      player2,
    );

    let eloRange: number;
    if (this.type == GameType.CLASSIC) {
      eloRange = player2.classic_elo - player1.classic_elo;
    } else {
      eloRange = player2.custom_elo - player1.custom_elo;
    }
    const expectedScore = 1 / (1 + Math.pow(10, eloRange / 400));

    let p1EloChange: number;
    let p2EloChange: number;

    switch (result) {
      case MatchResult.DRAW:
        p1EloChange = Math.round(eloKFactor * (0.5 - expectedScore));
        p2EloChange = Math.round(eloKFactor * (-0.5 + expectedScore));
        break;
      case MatchResult.P1_WIN:
        p1EloChange = Math.round(eloKFactor * (1 - expectedScore));
        p2EloChange = Math.round(eloKFactor * (-1 + expectedScore));
        player1Info.wins += 1;
        player2Info.losses += 1;
        break;
      case MatchResult.P2_WIN:
        p1EloChange = Math.round(eloKFactor * (0 - expectedScore));
        p2EloChange = Math.round(eloKFactor * (0 + expectedScore));
        player1Info.losses += 1;
        player2Info.wins += 1;
        break;
    }

    const matchDto: UpdateMatchDTO = {
      id: this.idMatch,
      score_p1: this.p1.score,
      score_p2: this.p2.score,
      elochange_p1: p1EloChange,
      elochange_p2: p2EloChange,
      result: result,
    };

    if (this.type == GameType.CLASSIC) {
      player1.classic_elo = player1Info.elo + p1EloChange;
      player1.classic_wins = player1Info.wins;
      player1.classic_losses = player1Info.losses;
      player2.classic_elo = player2Info.elo + p2EloChange;
      player2.classic_wins = player2Info.wins;
      player2.classic_losses = player2Info.losses;
    } else if (this.type == GameType.CUSTOM) {
      player1.custom_elo = player1Info.elo + p1EloChange;
      player1.custom_wins = player1Info.wins;
      player1.custom_losses = player1Info.losses;
      player2.custom_elo = player2Info.elo + p2EloChange;
      player2.custom_wins = player2Info.wins;
      player2.custom_losses = player2Info.losses;
    }

    this.logger.log('Sending the data to the database');
    this.matchService.updateMatch(matchDto);
    this.playerService.update(player1);
    await this.playerService.update(player2);
    this.logger.log('Update finished');
  }

  /***************************************\
   *        Game data handling           *
  \***************************************/

  private gameLoop() {
    this.logic.gameLoop();
    this.p1.socket.emit(
      ClientEndpoints.GAMESTATE,
      this.logic.getGamestate(true),
    );
    this.p2.socket.emit(
      ClientEndpoints.GAMESTATE,
      this.logic.getGamestate(false),
    );
  }

  public movePaddle(idPlayer: number, y: number) {
    if (idPlayer == this.p1.id) {
      this.logic.movePaddle(true, y);
    } else {
      this.logic.movePaddle(false, y);
    }
  }

  /***************************************\
   *        Class utility functions      *
  \***************************************/

  private identifyPlayers(socket: Socket): [GamePlayer, GamePlayer] {
    if (this.p1.socket?.id == socket.id) {
      return [this.p1, this.p2];
    } else if (this.p2.socket?.id == socket.id) {
      return [this.p2, this.p1];
    }
    this.logger.log(`Socket ${socket.id} could not be identified.`);
  }

  private async getTimeInfo(): Promise<any> {
    return {
      gameTimeLeft: this.gameTimeLeft,
      pauseTimeLeft:
        timeParameters.pauseLength -
        (this.paused && this.game_started
          ? new Date().getTime() - this.pause_started.getTime()
          : 0),
    };
  }

  public isReadyToStart(): boolean {
    return this.p1.connected && this.p2.connected;
  }

  public getGamePlayer(idPlayer: number): GamePlayer {
    if (idPlayer == this.p1.id) {
      return this.p1;
    } else if (idPlayer == this.p2.id) {
      return this.p2;
    }
  }

  public getType(): GameType {
    return this.type;
  }
}
