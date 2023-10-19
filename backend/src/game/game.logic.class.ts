import { Socket } from 'socket.io';
import { Player } from 'src/player/entities/player.entity';
import { Game } from './game.class';
import { IBall, IGamestate, IGameParameters, IPaddle } from './game.config';
import { IPlayerModeInfo } from 'src/player/dto_out/IPlayerModeInfo.dto';

export class GamePlayer {
  constructor() {
    this.setDefaultValues();
  }

  public connected: boolean;
  public score: number;
  public socket: Socket;
  public id: number;
  public entity: Player;
  public publicInfos: IPlayerModeInfo;
  public game: Game;

  public setDefaultValues() {
    this.connected = false;
    this.score = 0;
    this.socket = undefined;
    this.id = 0;
    this.entity = undefined;
  }
}

export class GameLogic {
  constructor(private parameters: IGameParameters) {
    this.p1PaddleList = structuredClone(parameters.p1PaddleList);
    this.p2PaddleList = structuredClone(parameters.p2PaddleList);
    this.ballList = structuredClone(parameters.ballList);
  }

  public p1Score = 0;
  public p2Score = 0;

  private ballList: IBall[] = [];
  private p1PaddleList: IPaddle[] = [];
  private p2PaddleList: IPaddle[] = [];
  private lastPaddleCollided: IPaddle;

  public gameLoop() {
    let ball: IBall;
    for (let i = 0; i < this.ballList.length; ++i) {
      ball = this.ballList[i];
      ball.position.x += ball.direction.x * ball.speed;
      ball.position.y += ball.direction.y * ball.speed;

      // Wall collision
      if (
        (ball.position.y - ball.radius < 0 && ball.direction.y < 0) ||
        (ball.position.y + ball.radius > this.parameters.fieldHeight &&
          ball.direction.y > 0)
      ) {
        ball.direction.y *= -1;
      }
      // Score hit
      if (ball.position.x < 0) {
        ++this.p1Score;
        this.ballList[i] = structuredClone(this.parameters.ballList[i]);
        if (ball.direction.x < 0) {
          ball.direction.x *= -1;
        }
      } else if (ball.position.x > this.parameters.fieldWidth) {
        ++this.p2Score;
        this.ballList[i] = structuredClone(this.parameters.ballList[i]);
        if (ball.direction.x > 0) {
          ball.direction.x *= -1;
        }
      }

      if (
        this.lastPaddleCollided &&
        Math.abs(this.lastPaddleCollided.position.x - ball.position.x) -
          ball.radius -
          this.lastPaddleCollided.halfWidth <
          0
      ) {
        return;
      }

      this.lastPaddleCollided = undefined;

      for (const paddle of this.p1PaddleList) {
        if (this.ballCollision(paddle, ball)) {
          this.lastPaddleCollided = paddle;
          ball.speed += ball.acceleration;
          return;
        }
      }
      for (const paddle of this.p2PaddleList) {
        if (this.ballCollision(paddle, ball)) {
          this.lastPaddleCollided = paddle;
          ball.speed += ball.acceleration;
          return;
        }
      }
    }
  }

  public initializeState() {
    // By default javascript passes everything by reference, you have to do this to make a deep clone of an object
    for (let i = 0; i < this.ballList.length; ++i) {
      this.ballList[i] = structuredClone(this.parameters.ballList[i]);
    }
    for (let i = 0; i < this.p1PaddleList.length; ++i) {
      this.p1PaddleList[i] = structuredClone(this.parameters.p1PaddleList[i]);
    }
    for (let i = 0; i < this.p2PaddleList.length; ++i) {
      this.p2PaddleList[i] = structuredClone(this.parameters.p2PaddleList[i]);
    }
  }

  public ballCollision(paddle: IPaddle, ball: IBall) {
    if (
      paddle.position.x - paddle.halfWidth <= ball.position.x + ball.radius &&
      paddle.position.x + paddle.halfWidth >= ball.position.x - ball.radius &&
      paddle.position.y - paddle.halfHeight <= ball.position.y + ball.radius &&
      paddle.position.y + paddle.halfHeight >= ball.position.y - ball.radius
    ) {
      const middleZoneLength = paddle.halfHeight * paddle.nonRedirectZone;
      const redirectZoneLength =
        paddle.halfHeight + ball.radius - middleZoneLength;
      const ballCollisionHeight = ball.position.y - paddle.position.y;
      let angle: number;

      if (ballCollisionHeight > middleZoneLength) {
        const ratio = Math.min(
          (ballCollisionHeight - middleZoneLength) / redirectZoneLength,
          1,
        );

        angle = -paddle.redirectAngle * ratio;
      } else if (ballCollisionHeight < -middleZoneLength) {
        const ratio = Math.min(
          (-ballCollisionHeight - middleZoneLength) / redirectZoneLength,
          1,
        );
        angle = paddle.redirectAngle * ratio;
      }
      if (!angle) {
        // middleZone
        ball.direction.x *= -1;
      } else {
        // redirectZone
        ball.direction.x = Math.cos(angle);
        if (ball.position.x < paddle.position.x) {
          ball.direction.x *= -1;
        }
        ball.direction.y = -Math.sin(angle);
      }
      return true;
    }
    return false;
  }

  public movePaddle(isPlayerOne: boolean, y: number) {
    let paddleList: IPaddle[];
    let variance: number;
    if (isPlayerOne) {
      paddleList = this.p1PaddleList;
    } else {
      paddleList = this.p2PaddleList;
    }

    for (const paddle of paddleList) {
      variance = this.parameters.fieldHeight - 2 * paddle.halfHeight;
      paddle.position.y = paddle.halfHeight + y * variance;
    }
  }

  public getGamestate(isPlayerOne: boolean): IGamestate {
    let variance =
      this.parameters.fieldHeight - 2 * this.p1PaddleList[0].halfHeight;
    const yP1 =
      (this.p1PaddleList[0].position.y - this.p1PaddleList[0].halfHeight) /
      variance;

    variance =
      this.parameters.fieldHeight - 2 * this.p2PaddleList[0].halfHeight;
    const yP2 =
      (this.p2PaddleList[0].position.y - this.p2PaddleList[0].halfHeight) /
      variance;
    if (isPlayerOne) {
      return {
        ballList: this.ballList.map((ball) => ball.position),
        yPlayer: yP1,
        yEnemy: yP2,
        playerScore: this.p1Score,
        enemyScore: this.p2Score,
      };
    } else {
      return {
        ballList: this.ballList.map((ball) => {
          return {
            x: this.parameters.fieldWidth - ball.position.x,
            y: ball.position.y,
          };
        }),
        yPlayer: yP2,
        yEnemy: yP1,
        playerScore: this.p2Score,
        enemyScore: this.p1Score,
      };
    }
  }

  public getPlayer1Score(): number {
    return this.p1Score;
  }

  public getPlayer2Score(): number {
    return this.p2Score;
  }
}
