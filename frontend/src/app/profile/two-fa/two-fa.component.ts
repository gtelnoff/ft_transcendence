import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { CookieService } from "ngx-cookie-service";
import { lastValueFrom } from "rxjs";
import { TwoFAService } from "src/app/services/2FA/two-fa.service";
import { BackendService } from "src/app/services/backend.service";
@Component({
  selector: "app-two-fa",
  templateUrl: "./two-fa.component.html",
  styleUrls: ["./two-fa.component.css"],
})
export class TwoFAComponent implements OnInit {
  login: string | undefined;
  icon: string | undefined;
  haveTwoFA: boolean;
  urlQRCode: string;
  code = new FormControl("");
  wrongCode: number = 0;
  selector: number = 1;
  durationInSeconds: number = 5;

  constructor(
    private http: HttpClient,
    private TwoFAService: TwoFAService,
    private backendService: BackendService,
    private route: Router,
    private cookieService: CookieService,
    private _snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.updateFields();
    if (this.haveTwoFA === true) this.selector = 3;
    else {
      let response = await this.getQRCode();
      this.urlQRCode = response.QRCode;
    }
  }

  openSnackBar(message: string) {
    this._snackBar.open(message, "ok", {
      duration: this.durationInSeconds * 1000,
    });
  }

  async getQRCode(): Promise<any> {
    return lastValueFrom(this.backendService.get("/auth/get-qrcode"));
  }

  // Change content when a button is clicked.
  async changeSelector(selector: number) {
    this.selector = selector;
    return;
  }

  async submitRemoveTwoFA() {
    let body;

    body = { code: this.code.value };
    const returnValue = await lastValueFrom(
      this.backendService.post("/auth/remove-twofa", body)
    );
    if (returnValue.success === true) {
      this.openSnackBar("Two Factor Authentication removed");
      this.route.navigate(["profile"]);
      return;
    }
    this.wrongCode = 1;
  }

  async submitAddTwoFA() {
    let body;

    body = { code: this.code.value };
    const returnValue = await lastValueFrom(
      this.backendService.post("/auth/add-twofa", body)
    );
    if (returnValue.success === true) {
      this.openSnackBar("Two Factor Authentication added");
      this.goTo("profile");
      return;
    }
    this.wrongCode = 1;
  }

  async addTwoFa() {
    await lastValueFrom(this.backendService.get("/player/addTwoFa"));
    this.updateFields();
  }

  logout() {
    this.cookieService.delete("jwtToken");
    this.cookieService.delete("_intra_42_session_production");
    this.route.navigate(["login"]);
  }

  async updateFields() {
    const player = await lastValueFrom(this.backendService.get("/player/me"));
    this.login = player.login;
    this.haveTwoFA = player.two_factor_auth;
  }

  goTo(url: string) {
    this.route.navigate([url]);
    return;
  }
}
