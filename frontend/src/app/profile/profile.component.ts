import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { lastValueFrom } from "rxjs";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { CookieService } from "ngx-cookie-service";
import { BackendService } from "src/app/services/backend.service";
import { TwoFAService } from "../services/2FA/two-fa.service";
import {
  BlockedPlayer,
  Friends,
  GameType,
  IPlayerPublicInfo,
  Match,
} from "../services/interfaces";
import { NotificationService } from "../services/notification.service";
import { LogCheckService } from "../services/log-check.service";

enum FriendState {
  ADD_FRIEND,
  CANCEL_INVITE,
  ACCEPT_INVITE,
  UNFRIEND,
}

enum BlockState {
  BLOCK,
  UNBLOCK,
}

@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.css"],
})
export class ProfileComponent implements OnInit {
  login: string | undefined;
  icon: string | undefined = "/assets/gremlins.jpg";
  haveTwoFA: boolean;
  urlQRCode: string;
  code = new FormControl("");
  wrongCode: number = 0;
  selector: number = 0;
  userName: string;
  messageForm = new FormGroup({
    message: new FormControl("", [Validators.required, Validators.max(10)]),
  });

  isTheUser: boolean;
  errorNotFound: boolean = false;
  player: IPlayerPublicInfo;
  matchList: Match[];

  /***** Friend logic attributes *****/
  friendButtonLabel = new Map<FriendState, string>([
    [FriendState.ADD_FRIEND, "Add friend"],
    [FriendState.CANCEL_INVITE, "Cancel invite"],
    [FriendState.ACCEPT_INVITE, "Accept invite"],
    [FriendState.UNFRIEND, "Unfriend"],
  ]);
  userFriend?: Friends;
  friendState: FriendState;
  canRefuseInvite: boolean = false;

  /****** Block logic attributes ******/
  blockButtonLabel = new Map<BlockState, string>([
    [BlockState.BLOCK, "Block"],
    [BlockState.UNBLOCK, "Unblock"],
  ]);
  userBlocked?: BlockedPlayer;
  blockState: BlockState;

  constructor(
    private http: HttpClient,
    private TwoFAService: TwoFAService,
    private backendService: BackendService,
    private router: Router,
    private route: ActivatedRoute,
    private cookieService: CookieService,
    public notificationService: NotificationService,
    private logCheckService: LogCheckService
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(() => {
      this.initialize();
    });
  }

  async initialize() {
    const username = this.route.snapshot.params["username"];
    if (!username) {
      this.player = await lastValueFrom(
        this.backendService.get("/player/myinfos")
      );
      this.isTheUser = true;
    } else {
      this.player = await lastValueFrom(
        this.backendService.get("/player/byUsername/" + username)
      );
      this.isTheUser = false;
    }
    if (this.player) {
      this.updateFields();
      this.updateMatchHistory();
      this.notificationService.watchPlayerStatus(this.player.id);
    } else {
      this.errorNotFound = true;
    }
  }

  /********************************************************************\
  |*                        Challenges                                *|
  \********************************************************************/

  classicChallenge() {
    this.notificationService.sendChallengeNotification(
      this.player.id,
      GameType.CLASSIC
    );
    this.router.navigateByUrl("/game/play", {
      state: { id_challenged: this.player.id, type: GameType.CLASSIC },
    });
  }

  customChallenge() {
    this.notificationService.sendChallengeNotification(
      this.player.id,
      GameType.CUSTOM
    );
    this.router.navigateByUrl("/game/play", {
      state: { id_challenged: this.player.id, type: GameType.CUSTOM },
    });
  }

  /********************************************************************\
  |*                  Field data population                           *|
  \********************************************************************/

  async updateFields() {
    const pathIcon = "/assets/";
    this.login = this.player.login;
    this.userName = this.player.username;
    this.isTheUser = this.player.is_the_user;
    if (this.player.two_factor_auth != undefined) {
      this.haveTwoFA = this.player.two_factor_auth;
    }
    if (!this.isTheUser) {
      this.updateBlockLogic();
      this.updateFriendLogic();
    }
    this.icon = pathIcon + this.player.avatar_path;
  }

  async updateMatchHistory() {
    this.matchList = await lastValueFrom(
      this.backendService.get("/match/byPlayerId/" + this.player.id)
    );
  }

  /********************************************************************\
  |*                  Friend button logic                             *|
  \********************************************************************/

  async updateFriendLogic() {
    this.userFriend = await lastValueFrom(
      this.backendService.get("/friends/current/" + this.player.id)
    );

    this.canRefuseInvite = false;
    if (!this.userFriend) {
      this.friendState = FriendState.ADD_FRIEND;
    } else if (this.userFriend.time_accepted != null) {
      this.friendState = FriendState.UNFRIEND;
    } else if (this.userFriend.id_invited == this.player.id) {
      this.friendState = FriendState.CANCEL_INVITE;
    } else {
      this.friendState = FriendState.ACCEPT_INVITE;
      this.canRefuseInvite = true;
    }
  }

  async friendButton() {
    if (this.friendState != undefined) {
      switch (this.friendState) {
        case FriendState.ACCEPT_INVITE:
          this.userFriend = await lastValueFrom(
            this.backendService.get("/friends/accept/" + this.player.id)
          );
          break;
        case FriendState.ADD_FRIEND:
          this.userFriend = await lastValueFrom(
            this.backendService.get("/friends/invite/" + this.player.id)
          );
          this.notificationService.sendFriendNotification(this.player.id);
          break;
        case FriendState.CANCEL_INVITE:
          await lastValueFrom(
            this.backendService.get("/friends/delete/" + this.player.id)
          );
          this.notificationService.cancelFriendNotification(this.player.id);
          delete this.userFriend;
          break;
        case FriendState.UNFRIEND:
          await lastValueFrom(
            this.backendService.get("/friends/delete/" + this.player.id)
          );
          delete this.userFriend;
          break;
      }
      await this.updateFriendLogic();
    }
  }

  async refuseInvite() {
    await lastValueFrom(
      this.backendService.get("/friends/delete/" + this.player.id)
    );
    delete this.userFriend;
    await this.updateFriendLogic();
  }

  /********************************************************************\
  |*                  Block button logic                              *|
  \********************************************************************/

  async updateBlockLogic() {
    this.userBlocked = await lastValueFrom(
      this.backendService.get("/blocked/byUser/" + this.player.id)
    );
    if (!this.userBlocked) {
      this.blockState = BlockState.BLOCK;
    } else {
      this.blockState = BlockState.UNBLOCK;
    }
  }

  async blockButton() {
    if (this.blockState == BlockState.BLOCK) {
      this.userBlocked = await lastValueFrom(
        this.backendService.get("/blocked/block/" + this.player.id)
      );
    } else {
      await lastValueFrom(
        this.backendService.get("/blocked/unblock/" + this.player.id)
      );
      this.userBlocked = undefined;
    }
    await this.updateBlockLogic();
    await this.updateFriendLogic();
  }

  /********************************************************************\
  |*      Settings options when the profile is owned by the user      *|
  \********************************************************************/

  async getQRCode(): Promise<any> {
    return lastValueFrom(this.backendService.get("/auth/get-qrcode"));
  }

  // Change content when a button is clicked.
  async changeSelector(selector: number) {
    if (selector === 1) {
      let response = await this.getQRCode();
      this.urlQRCode = response.QRCode;
    }

    this.selector = selector;
    return;
  }

  async submitRemoveTwoFA() {
    let body;

    body = { login: this.login, code: this.code.value };
    const returnValue = await lastValueFrom(
      this.backendService.post("/auth/check-code", body)
    );
    if (returnValue.acces === 1) {
      await this.removeTwoFA();
      window.location.reload();
      return;
    }
    this.wrongCode = 1;
  }

  async removeTwoFA() {
    await lastValueFrom(this.backendService.get("/player/removeTwoFA"));
  }

  async submitAddTwoFA() {
    let body;

    body = { login: this.login, code: this.code.value };
    const returnValue = await lastValueFrom(
      this.backendService.post("/auth/check-code", body)
    );
    if (returnValue.acces === 1) {
      await this.addTwoFa();
      window.location.reload();
      return;
    }
    this.wrongCode = 1;
  }

  async addTwoFa() {
    await lastValueFrom(this.backendService.get("/player/addTwoFa"));
    this.updateFields();
  }

  goTo(url: string) {
    this.router.navigate([url]);
    return;
  }

  logout() {
    this.cookieService.delete("jwtToken");
    this.cookieService.delete("_intra_42_session_production");
    this.notificationService.destroySocketConnection();
    this.logCheckService.isLogged = false;
    this.router.navigateByUrl("/login");
  }
}
