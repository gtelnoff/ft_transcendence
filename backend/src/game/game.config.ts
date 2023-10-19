import { GamePlayer } from './game.logic.class';

/***************************************\
 *              Enums                  *
\***************************************/

export enum GameType {
  CLASSIC = 0,
  CUSTOM = 1,
}

export enum ClientEndpoints {
  PLAYER_INFO = 'player',
  OPPONENT_INFO = 'opponent',
  START = 'start',
  PAUSE = 'pause',
  GAMESTATE = 'gamestate',
  INITIAL_STATE = 'initialstate',
  END = 'end',
  TIME_SYNC = 'timesync',
  RESUME = 'resume',
}

/***************************************\
 *        General Interfaces           *
\***************************************/

export interface IPlayerInQueue {
  gamePlayer: GamePlayer;
  iteration: number;
  type: GameType;
}

export interface IPlayerChallenge {
  gamePlayer: GamePlayer;
  id_challenged: number;
  type: GameType;
}

export interface ITimeParameters {
  fps: number;
  pauseLength: number;
  gameLength: number;
  resumeLength: number;
}

export interface IGameParameters {
  fieldWidth: number;
  fieldHeight: number;
  p1PaddleList: IPaddle[];
  p2PaddleList: IPaddle[];
  ballList: IBall[];
}

export interface IGamestate {
  ballList: Vector[];
  yPlayer: number;
  yEnemy: number;
  playerScore: number;
  enemyScore: number;
}

/***************************************\
 *        Game logic interfaces        *
\***************************************/

export interface Vector {
  x: number;
  y: number;
}

export interface IPaddle {
  position: Vector;
  halfWidth: number;
  halfHeight: number;
  // The non redirect zone is the section in the middle of the pad where only the direction of the ball (left or right) is gonna change, but not its angle.
  // The value repesents the ratio of the whole paddle length that will be concerned.
  nonRedirectZone: number;
  redirectAngle: number;
}

export interface IBall {
  position: Vector;
  direction: Vector;
  speed: number;
  acceleration: number;
  radius: number;
}
/***************************************\
 *       Game modes parameters         *
\***************************************/
export const gameDebugMode = false;
export const eloKFactor = 32;
const fieldWidth = 100;
const fieldHeight = 80;

export const timeParameters: ITimeParameters = {
  fps: 60,
  gameLength: 10000,
  pauseLength: 30000,
  resumeLength: 5000,
};

export const gameParameters: IGameParameters[] = [
  /******************* Classic ************************/
  {
    fieldWidth: fieldWidth,
    fieldHeight: fieldHeight,
    p1PaddleList: [
      {
        position: {
          x: fieldWidth * 0.9,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: -1 },
        halfWidth: 2,
        halfHeight: 5,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
    ],
    p2PaddleList: [
      {
        position: {
          x: fieldWidth * 0.1,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: 1 },
        halfWidth: 2,
        halfHeight: 5,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
    ],
    ballList: [
      {
        position: {
          x: fieldWidth / 2,
          y: fieldHeight / 2,
        },
        direction: { x: -1, y: 0 },
        speed: 1,
        acceleration: 0.1,
        radius: 1,
      },
    ],
  },

  /******************* Custom ************************/
  {
    fieldWidth: fieldWidth,
    fieldHeight: fieldHeight,
    p1PaddleList: [
      {
        position: {
          x: fieldWidth * 0.9,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: -1 },
        halfWidth: 2,
        halfHeight: 5,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
      {
        position: {
          x: fieldWidth * 0.4,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: -1 },
        halfWidth: 2,
        halfHeight: 3,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
    ],
    p2PaddleList: [
      {
        position: {
          x: fieldWidth * 0.1,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: 1 },
        halfWidth: 2,
        halfHeight: 5,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
      {
        position: {
          x: fieldWidth * 0.6,
          y: fieldHeight * 0.5,
        },
        // direction: { x: 0, y: 1 },
        halfWidth: 2,
        halfHeight: 3,
        nonRedirectZone: 0,
        redirectAngle: (7 * Math.PI) / 16,
      },
    ],
    ballList: [
      {
        position: {
          x: fieldWidth / 2,
          y: fieldHeight / 2,
        },
        direction: { x: -1, y: 0 },
        speed: 1,
        acceleration: 0.1,
        radius: 1,
      },
      {
        position: {
          x: fieldWidth / 2,
          y: fieldHeight / 2,
        },
        direction: { x: 1, y: 0 },
        speed: 1,
        acceleration: 0.1,
        radius: 1,
      },
    ],
  },
];
