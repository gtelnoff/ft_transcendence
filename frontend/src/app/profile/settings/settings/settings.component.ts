import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { environment } from "src/environments/environment";
import { BackendService } from "src/app/services/backend.service";
import { DomSanitizer } from "@angular/platform-browser";
import { Router } from "@angular/router";
import {
  FormControl,
  FormGroup,
  FormsModule,
  Validators,
} from "@angular/forms";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.css"],
})
export class SettingsComponent implements OnInit {
  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private backendService: BackendService,
    private route: Router
  ) {}
  file: File;
  fileName = "";
  url: string;
  login: string = "";
  haveTwoFA: boolean;
  icon: any = "../../../assets/gremlins.jpg";
  username: string;
  haveNewAvatar: boolean;
  errorUsername: string;
  badImageExtension: boolean;
  messageForm = new FormGroup({
    message: new FormControl("", [Validators.required, Validators.max(10)]),
  });

  async ngOnInit() {
    await this.updateFields();
    this.messageForm.controls["message"].setValue(this.username);
  }

  goTo(url: string) {
    this.route.navigate([url]);
  }

  getFile(event: any) {
    this.file = event.target.files[0];
    if (this.checkExtension(this.file.type) === false) {
      this.badImageExtension = true;
      return;
    }
    this.badImageExtension = false;
    this.haveNewAvatar = true;
    this.previewAvatar();

    return;
  }

  checkExtension(extension: string): boolean {
    if (extension === "image/png" || extension === "image/jpeg") return true;
    return false;
  }

  previewAvatar() {
    let reader = new FileReader();

    reader.readAsDataURL(this.file);
    reader.onload = (e: any) => {
      this.icon = e.target.result;
    };
  }

  async send() {
    let response: any;

    await this.saveAvatar();
    response = await this.saveNickname();
    if (response.error) {
      this.errorUsername = response.error;
      return;
    }
    this.route.navigate(["profile"]);
    return;
  }

  async saveAvatar() {
    let form = new FormData();
    if (this.haveNewAvatar != true) return;

    form.append("photo", this.file, this.file.name);

    await lastValueFrom(this.backendService.post("/player/upload", form));
    return;
  }

  async saveNickname() {
    let newUsername: string;
    newUsername = this.messageForm.controls["message"].value!;
    if (this.username == newUsername) return 0;
    const body = { newUsername: newUsername };
    const returnValue = await lastValueFrom(
      this.backendService.post("/player/changeUsername", body)
    );
    return returnValue;
  }

  async updateFields() {
    const pathIcon = "../../assets/";
    const player = await lastValueFrom(this.backendService.get("/player/me"));
    this.login = player.login;
    this.username = player.username;
    this.haveTwoFA = player.two_factor_auth;
    this.icon = pathIcon + player.avatar_path;
  }
}
