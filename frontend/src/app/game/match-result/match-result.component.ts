import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { lastValueFrom } from "rxjs";
import { BackendService } from "src/app/services/backend.service";
import {
  GameType,
  IPlayerMatchInfo,
  IPlayerPublicInfo,
  Match,
  Player,
} from "src/app/services/interfaces";

@Component({
  selector: "app-match-result",
  templateUrl: "./match-result.component.html",
  styleUrls: ["./match-result.component.css"],
})
export class MatchResultComponent implements OnInit {
  id_match: number | undefined;

  player: IPlayerPublicInfo;
  match: Match;
  type: GameType;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {
    this.getStateParameters();
  }

  async getStateParameters() {
    let state = this.router.getCurrentNavigation()?.extras.state;
    if (!state) {
      this.router.navigateByUrl("/game");
      return;
    }
    this.id_match = state["id_match"];
    if (!this.id_match) {
      this.router.navigateByUrl("/game");
      return;
    }
  }

  ngOnInit(): void {
    this.populateData();
  }

  async populateData() {
    const user: IPlayerPublicInfo = await lastValueFrom(
      this.backendService.get("/player/myinfos")
    );
    if (!user) return;
    const id_player = user.id;
    this.match = await lastValueFrom(
      this.backendService.get("/match/" + this.id_match)
    );
    if (!this.match) return;
    if (this.match && this.match.classic_game) {
      this.type = GameType.CLASSIC;
    } else {
      this.type = GameType.CUSTOM;
    }
    this.player = user;
  }
}
