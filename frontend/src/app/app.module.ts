import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { GameComponent } from "./game/game/game.component";
import { ChatComponent } from "./chat/chat.component";
import { NavBarComponent } from "./nav-bar/nav-bar.component";
import { ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatDialogModule } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatBadgeModule } from "@angular/material/badge";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { CookieService } from "ngx-cookie-service";
import { AuthInterceptor } from "./auth-interceptor";
import { NgOtpInputModule } from "ng-otp-input";
import { LoginFormComponent } from "./login/login-form/login-form.component";
import { LoginHandlerComponent } from "./login/login-handler/login-handler.component";
import { ProfileComponent } from "./profile/profile.component";
import { SettingsComponent } from "./profile/settings/settings/settings.component";
import { TwoFAComponent } from "./profile/two-fa/two-fa.component";
import { MatchComponent } from "./components/match/match.component";
import { ModeSelectComponent } from "./game/mode-select/mode-select.component";
import { MatchResultComponent } from "./game/match-result/match-result.component";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonToggleModule } from "@angular/material/button-toggle";

@NgModule({
  declarations: [
    AppComponent,
    GameComponent,
    ChatComponent,
    NavBarComponent,
    LoginFormComponent,
    LoginHandlerComponent,
    ProfileComponent,
    SettingsComponent,
    TwoFAComponent,
    MatchComponent,
    ModeSelectComponent,
    MatchResultComponent,
  ],
  imports: [
    CommonModule,
    NgOtpInputModule,
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatFormFieldModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useFactory: function (router: Router, cookieService: CookieService) {
        return new AuthInterceptor(router, cookieService);
      },
      multi: true,
      deps: [Router, CookieService],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
