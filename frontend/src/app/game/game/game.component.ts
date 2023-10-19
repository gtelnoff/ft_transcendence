import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
  Input,
  OnDestroy,
} from "@angular/core";
import * as THREE from "three";
import { io } from "socket.io-client";
import { CookieService } from "ngx-cookie-service";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable, count, lastValueFrom, map, takeWhile, timer } from "rxjs";
import { BackendService } from "src/app/services/backend.service";
import {
  IPlayerMatchInfo,
  GameType,
  IPlayerPublicInfo,
} from "src/app/services/interfaces";
import { SnackbarService } from "src/app/services/snackbar.service";

interface Vector {
  x: number;
  y: number;
}

interface IPaddle {
  position: Vector;
  halfWidth: number;
  halfHeight: number;
  variance?: number;
  mesh?: THREE.Mesh;
}

interface IBall {
  position: Vector;
  radius: number;
  mesh?: THREE.Mesh;
}

interface IGameParameters {
  fieldWidth: number;
  fieldHeight: number;
  playerPaddleList: IPaddle[];
  enemyPaddleList: IPaddle[];
  ballList: IBall[];
}

enum ClientEndpoints {
  PLAYER_INFO = "player",
  OPPONENT_INFO = "opponent",
  START = "start",
  PAUSE = "pause",
  GAMESTATE = "gamestate",
  INITIAL_STATE = "initialstate",
  END = "end",
  TIME_SYNC = "timesync",
  RESUME = "resume",
}

enum GameStatus {
  NOT_STARTED = "notstarted",
  RESUMING = "resuming",
  PLAYING = "playing",
  PAUSED = "paused",
}

@Component({
  selector: "app-game",
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.css"],
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild("canvasContainer", { static: true }) canvasContainer!: ElementRef;
  renderer = new THREE.WebGLRenderer({ alpha: true });
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerPaddleList: IPaddle[] = [];
  enemyPaddleList: IPaddle[] = [];
  ballList: IBall[] = [];
  mouse = new THREE.Vector2();
  mouseEvent!: MouseEvent;
  mouseOverPaddle: boolean = false;
  raycaster = new THREE.Raycaster();

  private socket: any;

  state$: Observable<Object>;
  type: GameType;
  id_challenged: number;
  parameters: IGameParameters;
  player: IPlayerMatchInfo;
  enemy: IPlayerMatchInfo;
  gameStatus: GameStatus = GameStatus.NOT_STARTED;
  gameTimeLeft: number = 60000;
  pauseTimeLeft: number = 30000;
  resumeTimeLeft: number = 5000;

  timeRemaining$ = timer(0, 1000).pipe(
    map((n) => this.gameTimeLeft - n * 1000),
    takeWhile((n) => n >= 0 && this.gameStatus == GameStatus.PLAYING, true)
  );
  pauseRemaining$ = timer(0, 1000).pipe(
    map((n) => this.pauseTimeLeft - n * 1000),
    takeWhile((n) => n >= 0 && this.gameStatus == GameStatus.PAUSED, true)
  );

  resumeRemaining$ = timer(0, 1000).pipe(
    map((n) => this.resumeTimeLeft - n * 1000),
    takeWhile((n) => n >= 0 && this.gameStatus == GameStatus.RESUMING, true)
  );

  constructor(
    private readonly cookieService: CookieService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly backendService: BackendService,
    private readonly snackbarService: SnackbarService
  ) {
    // We have to do this in the constructor because current navigation scope is ended before ngOnInit
    let state = this.router.getCurrentNavigation()?.extras.state;
    if (state) {
      this.type = state["type"];
      this.id_challenged = state["id_challenged"];
    }
    if (!state || this.type == undefined) {
      this.router.navigateByUrl("/game");
      return;
    }
  }

  ngOnInit() {
    // Just to verify the token is valid BEFORE loading everything , since websockets connections cannot be intercepted and meddled with like we do for
    // backend endpoints to add the token to the request

    this.backendService.redirectIfUnauthorized();

    this.socket = io("ws://" + window.location.hostname + ":3000/gameSocket");
    this.setupClientEndpoints();
    if (this.id_challenged != undefined) {
      this.socket.emit("challenge", {
        token: this.cookieService.get("jwtToken"),
        id_challenged: this.id_challenged,
        type: this.type,
      });
    } else {
      this.socket.emit("joinGame", {
        token: this.cookieService.get("jwtToken"),
        type: this.type,
      });
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  setupClientEndpoints() {
    this.socket.on(
      ClientEndpoints.INITIAL_STATE,
      (gameParameters: IGameParameters) => {
        this.parameters = gameParameters;
        this.setupGameObjects();
      }
    );

    this.socket.on(ClientEndpoints.GAMESTATE, (gameData: any) => {
      this.handleGameStateUpdate(gameData);
    });

    this.socket.on(ClientEndpoints.PLAYER_INFO, (player: IPlayerMatchInfo) => {
      this.player = player;
    });

    this.socket.on(ClientEndpoints.OPPONENT_INFO, (enemy: IPlayerMatchInfo) => {
      this.enemy = enemy;
      this.gameStatus = GameStatus.PAUSED;
    });

    this.socket.on(ClientEndpoints.RESUME, (resumeTime: number) => {
      this.resumeTimeLeft = resumeTime;
      this.gameStatus = GameStatus.RESUMING;
      this.resumeRemaining$ = timer(0, 1000).pipe(
        map((n) => this.resumeTimeLeft - n * 1000),
        takeWhile((n) => n >= 0 && this.gameStatus == GameStatus.RESUMING, true)
      );
    });

    this.socket.on(ClientEndpoints.START, () => {
      // The fact we are using a timer with a delay of 1000ms for our clocks means if a player joins midgame and gets a timeLeft where timeLeft % 1000 != 0,
      // it will create a desync on the client of said modulo milliseconds, which might be really annoying especially in an end game situation.
      // To avoid that, we start the observable after a timeout of timeleft % 1000. Same is done for the pausing, but is not necessary for resuming,
      // as it can't be interrupted and then resumed itself.
      this.gameStatus = GameStatus.PLAYING;
      setTimeout(() => {
        this.timeRemaining$ = timer(0, 1000).pipe(
          map((n) => this.gameTimeLeft - n * 1000),
          takeWhile(
            (n) => n >= 0 && this.gameStatus == GameStatus.PLAYING,
            true
          )
        );
      }, this.gameTimeLeft % 1000);
      this.gameTimeLeft -= this.gameTimeLeft % 1000;
    });

    this.socket.on(ClientEndpoints.PAUSE, () => {
      // See above for WHY timeout into observable start
      this.gameStatus = GameStatus.PAUSED;
      setTimeout(() => {
        this.pauseRemaining$ = timer(0, 1000).pipe(
          map((n) => this.pauseTimeLeft - n * 1000),
          takeWhile((n) => n >= 0 && this.gameStatus == GameStatus.PAUSED, true)
        );
      }, this.pauseTimeLeft % 1000);
      this.pauseTimeLeft -= this.pauseTimeLeft % 1000;
    });

    this.socket.on(ClientEndpoints.END, (idMatch: number | undefined) => {
      if (!idMatch || idMatch == -1) {
        if (idMatch == -1) {
          this.snackbarService.error("Your challenge was refused");
        }
        this.router.navigate(["/game"]);
      } else {
        this.router.navigateByUrl("/game/result", {
          state: { id_match: idMatch },
        });
      }
    });

    this.socket.on(ClientEndpoints.TIME_SYNC, (payload: any) => {
      this.gameTimeLeft = payload.gameTimeLeft;
      this.pauseTimeLeft = payload.pauseTimeLeft;
    });
  }

  /*********************************\
        GameObjects initialization
  \*********************************/

  setupGameObjects() {
    this.scene = new THREE.Scene();

    this.setupCamera();
    this.setupGamefield();
    this.setupPaddles();
    this.setupBall();
    this.setupBorders();
    this.setupLight();

    this.updateRendererSize();
    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);
    this.animate();
    this.renderer.domElement.addEventListener(
      "touchmove",
      this.onTouchMove.bind(this),
      false
    );

    window.addEventListener("resize", () => {
      this.updateRendererSize();
      this.camera.aspect =
        this.canvasContainer.nativeElement.clientWidth /
        this.canvasContainer.nativeElement.clientHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  setupCamera() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const fieldOfView = 75;
    const nearPlane = 0.1;
    const farPlane = 1000;
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      aspectRatio,
      nearPlane,
      farPlane
    );

    this.camera.position.x = this.parameters.fieldWidth * 1.2;
    this.camera.position.y = this.parameters.fieldHeight / 2;
    this.camera.position.z = 80;
    this.camera.rotation.z = Math.PI / 2;
    this.camera.rotation.y = Math.PI / 6;
  }

  setupGamefield() {
    const fieldGeometry = new THREE.BoxGeometry(
      this.parameters.fieldWidth,
      this.parameters.fieldHeight,
      6
    );
    const fieldMaterial = new THREE.MeshPhongMaterial({ color: 0xdd1aff });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.receiveShadow = true;
    field.position.x = this.parameters.fieldWidth / 2;
    field.position.y = this.parameters.fieldHeight / 2;
    field.position.z = -3;
    var geometry = new THREE.BufferGeometry();
    var positions = [];
    positions.push(0, 0, 0.1);
    positions.push(0, this.parameters.fieldHeight, 0.1);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    var material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.8,
      gapSize: 1,
    });
    var line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.position.x = this.parameters.fieldWidth / 2;
    line.position.z = -0.05;
    line.position.y = 0;
    this.scene.add(line);
    this.scene.add(field);
  }

  setupPaddles() {
    for (let paddle of this.parameters.playerPaddleList) {
      const paddleGeometry = new THREE.BoxGeometry(
        paddle.halfWidth * 2,
        paddle.halfHeight * 2,
        3
      );
      const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(paddleGeometry, paddleMaterial);
      mesh.position.x = paddle.position.x;
      mesh.position.y = paddle.position.y;
      mesh.position.z = 0.5;

      paddle.variance = this.parameters.fieldHeight - 2 * paddle.halfHeight;
      paddle.mesh = mesh;
      this.playerPaddleList.push(paddle);
      this.scene.add(mesh);
    }
    for (let paddle of this.parameters.enemyPaddleList) {
      const paddleGeometry = new THREE.BoxGeometry(
        paddle.halfWidth * 2,
        paddle.halfHeight * 2,
        3
      );
      const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(paddleGeometry, paddleMaterial);
      mesh.position.x = paddle.position.x;
      mesh.position.y = paddle.position.y;
      mesh.position.z = 0.5;

      paddle.variance = this.parameters.fieldHeight - 2 * paddle.halfHeight;
      paddle.mesh = mesh;
      this.enemyPaddleList.push(paddle);
      this.scene.add(mesh);
    }
  }

  setupBall() {
    for (let ball of this.parameters.ballList) {
      const ballGeometry = new THREE.BoxGeometry(
        ball.radius * 2,
        ball.radius * 2,
        ball.radius * 2
      );
      const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(ballGeometry, ballMaterial);
      mesh.position.z = 0.3;
      mesh.position.x = this.parameters.fieldWidth * 0.5;
      mesh.position.y = this.parameters.fieldHeight * 0.5;
      ball.mesh = mesh;
      this.ballList.push(ball);
      this.scene.add(mesh);
    }
  }

  setupBorders() {
    const borderGeometry = new THREE.BoxGeometry(
      this.parameters.fieldWidth,
      0.1,
      7
    );
    const borderMaterial = new THREE.MeshPhongMaterial({
      color: 0x00bbff,
      opacity: 0.25,
      transparent: true,
    }); // bleu
    const border1 = new THREE.Mesh(borderGeometry, borderMaterial);
    border1.position.x = this.parameters.fieldWidth / 2;
    border1.position.y = this.parameters.fieldHeight;
    border1.position.z = 3.5;
    this.scene.add(border1);
    const border2 = new THREE.Mesh(borderGeometry, borderMaterial);
    border2.position.x = this.parameters.fieldWidth / 2;
    border2.position.y = 0;
    border2.position.z = 3.5;
    this.scene.add(border2);
  }

  setupLight() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 10, 5);
    light.castShadow = true;
    this.scene.add(light);
  }

  /*********************************\
            Window events
  \*********************************/

  @HostListener("mousemove", ["$event"])
  onMouseMove(event: MouseEvent) {
    event.preventDefault();

    this.mouse.x = event.clientX / window.innerWidth;
    this.mouse.y = -event.clientY / window.innerHeight;

    // Convert mouse position to game coordinates
    this.setPaddlePosition(event.clientX / window.innerWidth);
  }

  onTouchMove(event: TouchEvent) {
    event.preventDefault();

    // First touch point
    const touch = event.targetTouches[0];

    this.mouse.x = touch.clientX / window.innerWidth;
    this.mouse.y = touch.clientY / window.innerHeight;

    this.setPaddlePosition(touch.clientX / window.innerWidth);
  }

  setPaddlePosition(yRatio: number) {
    let gameY: number;
    for (let paddle of this.playerPaddleList) {
      if (paddle.variance && paddle.mesh) {
        gameY = paddle.halfHeight + yRatio * paddle.variance;
        paddle.mesh.position.y = gameY;
      }
    }

    if (this.gameStatus == GameStatus.PLAYING) {
      this.socket.emit("movePaddle", {
        y: yRatio,
      });
    }
  }

  /*********************************\
            Gamestate update
  \*********************************/

  handleGameStateUpdate(gameData: any) {
    for (let i = 0; i < this.ballList.length; ++i) {
      let mesh = this.ballList[i].mesh;
      if (mesh) {
        mesh.position.x = gameData.ballList[i].x;
        mesh.position.y = gameData.ballList[i].y;
      }
    }

    for (let paddle of this.playerPaddleList) {
      if (paddle.mesh && paddle.variance) {
        paddle.mesh.position.y =
          paddle.halfHeight + gameData.yPlayer * paddle.variance;
      }
    }

    for (let paddle of this.enemyPaddleList) {
      if (paddle.mesh && paddle.variance) {
        paddle.mesh.position.y =
          paddle.halfHeight + gameData.yEnemy * paddle.variance;
      }
    }

    this.player.score = gameData.playerScore;
    this.enemy.score = gameData.enemyScore;
  }

  updateRendererSize() {
    let width = this.canvasContainer.nativeElement.clientWidth;
    let height = this.canvasContainer.nativeElement.clientHeight;
    this.renderer.setSize(width, height);
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());

    this.renderer.render(this.scene, this.camera);
  }
}
