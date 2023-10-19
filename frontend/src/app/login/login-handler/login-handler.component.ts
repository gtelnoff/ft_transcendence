import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import { CookieService } from "ngx-cookie-service";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { PlatformLocation } from "@angular/common";
import { environment } from "src/environments/environment";
import { BackendService } from "src/app/services/backend.service";

export const haveTwoFA = 1;
export const isFirstConnection = 2;
@Component({
  selector: "app-login-handler",
  templateUrl: "./login-handler.component.html",
  styleUrls: ["./login-handler.component.css"],
})
export class LoginHandlerComponent implements OnInit {
  constructor(
    private backendService: BackendService,

    private router: Router,
    private http: HttpClient,
    private cookieService: CookieService,
    private platformLocation: PlatformLocation
  ) {}
  badImageExtension: boolean;
  buttonPressed: boolean;
  code = new FormControl("");
  selector: number;
  wrongCode: boolean;
  haveNewAvatar: boolean;
  returnUrl: string | null;
  firstName: string;
  login: string;
  icon: string = "../../assets/gremlins.jpg";
  file: File;
  avatar: string = "../../assets/gremlins.jpg";
  messageForm = new FormGroup({
    message: new FormControl("", [Validators.required, Validators.max(10)]),
  });
  errorUsername: string;

  // Retrieve the code from the URL after logging in with the 42 API.
  async ngOnInit() {
    let code: string | undefined;
    let response: any;
    this.returnUrl = sessionStorage.getItem("lastRoute");
    code = this.getCodeInUrl();

    if (this.checkPageReload() == true || !code) {
      this.router.navigate(["login"]);
      return;
    }

    response = await this.tryLogin(code);

    if (response == isFirstConnection) {
      this.selector = 2;
    } else if (response == haveTwoFA) this.selector = 1;

    sessionStorage.setItem("previousUrl", this.platformLocation.href);
    this.redirectIfLogged();
  }

  // Check if the page has been reloaded or not, if so, return to the login page.
  checkPageReload(): boolean {
    let currentUrl: string;
    let previousUrl: string | null;

    currentUrl = this.platformLocation.href;
    previousUrl = sessionStorage.getItem("previousUrl");
    if (previousUrl && currentUrl === previousUrl) return true;
    return false;
  }

  // Retrieves the 42 api return code located in the url
  getCodeInUrl(): string | undefined {
    let url: string;
    let splitValues: string[];

    url = this.router.url;
    splitValues = url.split("=", 2);

    if (splitValues.length != 2) return undefined;
    return splitValues[1];
  }

  // Try to Generates the user's JWT and stores it in cookies
  async tryLogin(apiCode: string) {
    let url: string;
    let body: any;
    let response: any;

    url = "/auth/try-login";
    body = {
      apiCode: apiCode,
      returnUri: "http://" + window.location.host + "/login-handler",
    };

    response = await lastValueFrom(this.backendService.post(url, body));
    if (response.access == "badCode")
    {
      this.router.navigate(['login']);
      return ;
    }
    document.cookie = "fortyTwoToken=" + response.fortyTwoToken +"; SameSite=Lax;";
    this.firstName = response.first_name;
    this.login = response.login;
    if (response.isFirstConnection === true) return isFirstConnection;
    if (response.twoFA === true) return haveTwoFA;

    // The user has been logged !
    document.cookie = "jwtToken=" + response.jwt +"; SameSite=Lax;";
    return;
  }

  // Checks the 2FA code entered by the user.
  async checkCode() {
    let url: string;
    let fortyTwoToken: string;
    let body: any;
    let response: any;

    // url = environment.backend_url + "/auth/check-twofa-code";
    fortyTwoToken = this.cookieService.get("fortyTwoToken");
    body = { fortyTwoToken: fortyTwoToken, code: this.code.value };

    response = await lastValueFrom(
      this.backendService.post("/auth/check-twofa-code", body)
    );
    if (response.access === false) {
      this.wrongCode = true;
      return;
    }

    document.cookie = "jwtToken=" + response.jwt +"; SameSite=Lax;";
    this.cookieService.delete("fortyTwoToken");
    this.router.navigate(["profile"]);
  }

  // Easily change url
  goTo(url: string) {
    this.router.navigate([url]);
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
    let url: string;
    let fortyTwoToken: string;
    let body: any;
    let response: any;
    let username: string;

    if (this.buttonPressed == true) return;
    this.buttonPressed = true;
    username = this.messageForm.controls["message"].value!;
    fortyTwoToken = this.cookieService.get("fortyTwoToken");
    body = { fortyTwoToken: fortyTwoToken, username: username };
    response = await lastValueFrom(
      this.backendService.post("/auth/change-username", body)
    );
    if (response.error) {
      this.errorUsername = response.error;
      this.buttonPressed = false;
      return;
    }

    document.cookie = "jwtToken=" + response.jwt +"; SameSite=Lax;";
    await this.saveAvatar();
    this.buttonPressed = false;
    this.router.navigate(["profile"]);
  }

  async saveAvatar() {
    let url: string;
    let form = new FormData();

    if (this.haveNewAvatar != true) return;

    form.append("photo", this.file, this.file.name);
    const returnValue = await lastValueFrom(
      this.backendService.post("/player/upload", form)
    );
    return;
  }

  redirectIfLogged() {
    const lastRoute = sessionStorage.getItem("lastRoute");
    if (document.cookie.includes("jwtToken") == true) {
      this.backendService.get("/auth/logged").subscribe((response) => {
        if (lastRoute) this.router.navigateByUrl(decodeURIComponent(lastRoute));
        else this.router.navigateByUrl("/profile");
      });
    }
  }
}
