import { I18nPluralPipe, formatDate } from "@angular/common";
import {
  Component,
  Inject,
  Input,
  LOCALE_ID,
  OnChanges,
  OnInit,
  Optional,
  SimpleChanges,
  ViewEncapsulation,
} from "@angular/core";
import { lastValueFrom } from "rxjs";
import { BackendService } from "src/app/services/backend.service";
import {
  IPlayerMatchInfo,
  IPlayerPublicInfo,
  Match,
  MatchResult,
} from "src/app/services/interfaces";

enum Result {
  WIN = "Win",
  LOSS = "Loss",
  DRAW = "Draw",
}

enum GameTypeLabel {
  CLASSIC = "Classic",
  CUSTOM = "Double trouble",
}

@Component({
  selector: "app-match",
  templateUrl: "./match.component.html",
  styleUrls: ["./match.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class MatchComponent implements OnChanges {
  @Input()
  match: Match;

  @Input()
  player: IPlayerPublicInfo;
  enemy: IPlayerPublicInfo;

  player_mode_info: IPlayerMatchInfo;
  enemy_mode_info: IPlayerMatchInfo;

  gametypeLabel: GameTypeLabel;
  player_score: number;
  enemy_score: number;
  result: Result;
  time: string;
  isPlayer1: boolean;

  constructor(
    private readonly backendService: BackendService,
    @Inject(LOCALE_ID) private readonly locale: string
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.populateData();
  }

  populatePlayerModeInfo(
    isClassicGame: boolean,
    player: IPlayerPublicInfo
  ): IPlayerMatchInfo {
    if (isClassicGame) {
      return {
        id: player.id,
        avatar_path: player.avatar_path,
        elo: player.classic_elo,
        wins: player.classic_wins,
        losses: player.classic_losses,
        score: 0,
        username: player.username,
      };
    } else {
      return {
        id: player.id,
        avatar_path: player.avatar_path,
        elo: player.custom_elo,
        wins: player.custom_wins,
        losses: player.custom_losses,
        score: 0,
        username: player.username,
      };
    }
  }

  async populateData() {
    if (!this.match || !this.player) {
      return;
    }

    if (this.match.classic_game) {
      this.gametypeLabel = GameTypeLabel.CLASSIC;
    } else {
      this.gametypeLabel = GameTypeLabel.CUSTOM;
    }

    let id_enemy: number;
    if (this.player.id == this.match.id_player1) {
      id_enemy = this.match.id_player2;
      this.isPlayer1 = true;
    } else {
      id_enemy = this.match.id_player1;
      this.isPlayer1 = false;
    }
    if (this.match.result == MatchResult.DRAW) {
      this.result = Result.DRAW;
    } else if ((this.match.result == MatchResult.P1_WIN) != !this.isPlayer1) {
      this.result = Result.WIN;
    } else {
      this.result = Result.LOSS;
    }
    this.enemy = await lastValueFrom(
      this.backendService.get("/player/byId/" + id_enemy)
    );
    this.enemy.id = id_enemy;

    this.player_mode_info = this.populatePlayerModeInfo(
      this.match.classic_game,
      this.player
    );
    this.enemy_mode_info = this.populatePlayerModeInfo(
      this.match.classic_game,
      this.enemy
    );
    if (this.isPlayer1) {
      this.player_mode_info.score = this.match.score_p1;
      this.player_mode_info.elochange = this.match.elochange_p1;
      this.enemy_mode_info.score = this.match.score_p2;
      this.enemy_mode_info.elochange = this.match.elochange_p2;
    } else {
      this.player_mode_info.score = this.match.score_p2;
      this.player_mode_info.elochange = this.match.elochange_p2;
      this.enemy_mode_info.score = this.match.score_p1;
      this.enemy_mode_info.elochange = this.match.elochange_p1;
    }

    this.time = formatDate(this.match.time_started, "dd/MM HH:mm", this.locale);
  }
}
