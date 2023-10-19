import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { lastValueFrom } from "rxjs";
import { PlatformLocation } from "@angular/common";
import { BackendService } from "src/app/services/backend.service";
import { environment } from "src/environments/environment";
import { LogCheckService } from "src/app/services/log-check.service";

@Component({
  selector: "app-login-form",
  templateUrl: "./login-form.component.html",
  styleUrls: ["./login-form.component.css"],
})
export class LoginFormComponent implements OnInit {
  host: string = encodeURIComponent(window.location.host);
  api_uid: string = environment.api_uid;
  returnUrl: string | null;
  clickOnLoginButton: boolean = false;

  constructor(
    private backend: BackendService,
    private router: Router,
    private route: ActivatedRoute,
    private platformLocation: PlatformLocation,
    private readonly logCheckService: LogCheckService
  ) {}

  ngOnInit() {
    this.returnUrl = sessionStorage.getItem("lastRoute");
    if (this.platformLocation.href.includes("returnUrl")) {
      const index = this.platformLocation.href.indexOf("2F") + 2;
      const path = "/" + this.platformLocation.href.substring(index);
      sessionStorage.setItem("lastRoute", path);
    }
    this.redirectIfLogged();
  }

  loginButtonClicked() {
    this.clickOnLoginButton = true;
    //add a timeout to redirect after 1 second
    setTimeout(() => {
      const url = `https://api.intra.42.fr/oauth/authorize?client_id=${this.api_uid}&redirect_uri=http%3A%2F%2F${this.host}%2Flogin-handler&response_type=code`;
      window.location.href = url;
    }, 350);
  }

  redirectIfLogged() {
    if (document.cookie.includes("jwtToken")) {
      this.backend.get("/auth/logged").subscribe((response) => {
        const returnUrl = this.route.snapshot.queryParams["returnUrl"];
        if (returnUrl) this.router.navigateByUrl(returnUrl);
        else this.router.navigateByUrl("/profile");
      });
    }
  }

  async debugTestUser() {
    const token = await lastValueFrom(this.backend.get("/auth/TestUser"));
    document.cookie =
      "jwtToken=" + token.access_token + "; SameSite=None; Secure";
    this.logCheckService.isLogged = true;
    this.router.navigateByUrl("/profile");
  }
}
