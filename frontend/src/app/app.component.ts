import { Component, AfterViewInit } from "@angular/core";
import { Router } from "@angular/router";
import { NotificationService } from "./services/notification.service";
import { Observable, interval, Subscription } from "rxjs";
import { map, takeWhile } from "rxjs/operators";
import { CookieService } from "ngx-cookie-service";
import { LogCheckService } from "./services/log-check.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements AfterViewInit {
  title = "connexion";
  private watchSubscription: Subscription;

  constructor(
    private route: Router,
    private socketService: NotificationService,
    private cookieService: CookieService,
    public logCheckService: LogCheckService
  ) {}

  ngAfterViewInit() {
    this.watchSubscription = this.watchCookie("jwtToken").subscribe(
      (tokenExists) => {
        if (tokenExists) {
          this.logCheckService.isLogged = true;
          this.socketService.setupSocketConnection();
          this.watchSubscription.unsubscribe();
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.watchSubscription) {
      this.watchSubscription.unsubscribe();
    }
    this.socketService.destroySocketConnection();
  }

  watchCookie(cookieName: string): Observable<boolean> {
    return interval(200).pipe(map(() => this.cookieService.check(cookieName)));
  }

  goToLogin() {
    this.route.navigate(["/login"]);
  }
}
