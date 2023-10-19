import { Component, OnInit, AfterViewInit } from "@angular/core";
import { NotificationService } from "../services/notification.service";
import { NotifType, PlayerNotif } from "../services/interfaces";
import { BackendService } from "../services/backend.service";
import { lastValueFrom } from "rxjs";
import { Router } from "@angular/router";

@Component({
  selector: "app-nav-bar",
  templateUrl: "./nav-bar.component.html",
  styleUrls: ["./nav-bar.component.css"],
})
export class NavBarComponent implements OnInit {
  hideNotifList: boolean = true;
  notifTypeLabel = new Map<string, string>([
    [NotifType.CHALLENGE, "challenge request"],
    [NotifType.FRIEND, "friend request"],
    [NotifType.MSG, "new message(s)"],
  ]);

  constructor(
    public socketService: NotificationService,
    private readonly backendService: BackendService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {}

  async accept(notification: PlayerNotif) {
    // actions on backend
    // then remove notification from notifications list

    if (notification.type == NotifType.FRIEND) {
      await lastValueFrom(
        this.backendService.get("/friends/accept/" + notification.id_friend)
      );
      this.socketService.removeNotification(notification);
    } else if (notification.type == NotifType.CHALLENGE) {
      this.router.navigateByUrl("/game/play", {
        state: {
          id_challenged: notification.id_challenger,
          type: notification.gameType,
        },
      });
      this.socketService.removeNotification(notification);
    }
  }

  async reject(notification: PlayerNotif) {
    // actions on backend
    // then remove notification from notifications list
    if (notification.type == NotifType.FRIEND) {
      await lastValueFrom(
        this.backendService.get("/friends/delete/" + notification.id_friend)
      );
      this.socketService.removeNotification(notification);
    } else if (notification.type == NotifType.CHALLENGE) {
      this.socketService.refuseChallenge(notification.id_challenger);
      this.socketService.removeNotification(notification);
    }
  }
}
