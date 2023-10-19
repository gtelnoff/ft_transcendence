import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { BackendService } from "src/app/services/backend.service";
import { GameType } from "src/app/services/interfaces";

@Component({
  selector: "app-mode-select",
  templateUrl: "./mode-select.component.html",
  styleUrls: ["./mode-select.component.css"],
})
export class ModeSelectComponent {
  constructor(private backendService: BackendService) {
    this.backendService.redirectIfUnauthorized();
  }
}
