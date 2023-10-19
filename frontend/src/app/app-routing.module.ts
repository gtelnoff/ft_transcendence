import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LoginFormComponent } from "./login/login-form/login-form.component";
import { LoginHandlerComponent } from "./login/login-handler/login-handler.component";
import { ProfileComponent } from "./profile/profile.component";
import { GameComponent } from "./game/game/game.component";
import { ChatComponent } from "./chat/chat.component";
import { SettingsComponent } from "./profile/settings/settings/settings.component";
import { TwoFAComponent } from "./profile/two-fa/two-fa.component";
import { ModeSelectComponent } from "./game/mode-select/mode-select.component";
import { MatchResultComponent } from "./game/match-result/match-result.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "profile",
    pathMatch: "full",
  },
  {
    path: "profile/:username",
    component: ProfileComponent,
  },
  {
    path: "profile",
    component: ProfileComponent,
  },
  {
    path: "game",
    component: ModeSelectComponent,
  },
  { path: "game/play", component: GameComponent },
  { path: "game/result", component: MatchResultComponent },
  {
    path: "chat",
    component: ChatComponent,
  },
  {
    path: "settings",
    component: SettingsComponent,
  },
  {
    path: "twofa",
    component: TwoFAComponent,
  },
  { path: "login", component: LoginFormComponent },
  { path: "login-handler", component: LoginHandlerComponent },
  {
    path: "**",
    redirectTo: "profile",
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
