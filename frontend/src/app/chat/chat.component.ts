import { Component, ChangeDetectorRef, Inject } from "@angular/core";
import { Channel, Player, GameType, IFriend } from "../services/interfaces";
import { FormGroup, FormControl, FormsModule } from "@angular/forms";
import { lastValueFrom, Subscription } from "rxjs";
import { BackendService } from "src/app/services/backend.service";
import {
  MatDialog,
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";
import { ThemePalette } from "@angular/material/core";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { NotificationService } from "../services/notification.service";
import { Router } from "@angular/router";
import { SnackbarService } from "../services/snackbar.service";
import { ChatService } from "./chat.service";
import { Socket, io } from "socket.io-client";

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"],
})
export class ChatComponent {
  // username: string;
  FRIENDS_SELECTOR: string = "FRIENDS";
  CHATS_SELECTOR: string = "CHATS";
  leftBarSelector: string = this.CHATS_SELECTOR;

  user: Player;
  messageForm = new FormGroup({
    message: new FormControl(""),
  });
  intervalSubscription: Subscription;
  color: ThemePalette = "accent";
  gameType = GameType;
  allFriends: IFriend[];

  chatSocket: Socket;

  constructor(
    private backendService: BackendService,
    public notificationService: NotificationService,
    public chatService: ChatService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    public router: Router
  ) {
    this.chatService.currentChannelUserList = [];
    this.chatService.currentChannelMessages = [];
    this.chatService.currentChannel = undefined;
  }

  showScrollButton = false;
  showLeftBar = true;
  showRightBar = false;
  autoKick = false;

  ngOnInit() {
    this.getUser();
    this.chatSocket = io(
      "ws://" + window.location.hostname + ":3000/chatSocket"
    );
    this.chatService.setupChatSocket(this.chatSocket, this.cdr);

    this.getAllFriends();
    this.getChannelList();
  }

  ngOnDestroy() {
    if (document.cookie.includes("jwtToken") == false) {
      return;
    }
    this.chatSocket.disconnect();
  }

  /********************************************************************\
  |*                        UI events                                 *|
  \********************************************************************/

  onScroll() {
    const div = document.getElementById("chatMessagesContainer");
    this.showScrollButton =
      div!.scrollTop + div!.clientHeight < div!.scrollHeight - 50;
  }

  scrollToBottom() {
    const div = document.getElementById("chatMessagesContainer");
    div!.scrollTop = div!.scrollHeight;
    this.closeLeftBar();
  }

  switchLeftBar() {
    this.showLeftBar = !this.showLeftBar;
  }

  closeLeftBar() {
    this.showLeftBar = false;
  }

  switchRightBar() {
    this.showRightBar = !this.showRightBar;
  }

  closeRightBar() {
    this.showRightBar = false;
  }

  changeLeftBarSelector(selector: string) {
    this.leftBarSelector = selector;
  }

  /********************************************************************\
  |*                    Channel user list events                      *|
  \********************************************************************/

  kickUser(id: number, channelID: number) {
    this.chatService.kickUser(this.chatSocket, id, channelID);
  }

  async banUser(id: number) {
    this.chatService.banUser(this.chatSocket, id);
  }

  async muteUser(id: number) {
    if (this.chatService.currentChannel)
      lastValueFrom(
        this.backendService.post("/channel/mute", {
          channelID: this.chatService.currentChannel.id,
          user: id,
        })
      );
  }

  async setAdmin(id: number) {
    if (this.chatService.currentChannel)
      lastValueFrom(
        this.backendService.post("/channel/setAdmin", {
          channelID: this.chatService.currentChannel.id,
          user: id,
        })
      );
  }

  async InviteUser(user: string) {
    const id = await lastValueFrom(
      this.backendService.get("/player/idByName/" + user)
    );
    if (!id) {
      this.snackbarService.error("No player named " + user + " found");
      return;
    }
    if (!this.chatService.currentChannel) {
      this.snackbarService.error("No channel selected.");
      return;
    }
    this.chatService.inviteUser(this.chatSocket, id.id);
  }

  openDialogInvite(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ): void {
    const dialogRef = this.dialog.open(InviteDialog, {
      width: "300px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {},
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.InviteUser(result);
      }
    });
  }

  /********************************************************************\
  |*                       Channel events                             *|
  \********************************************************************/

  async changeCurrentChannel(id: number | undefined) {
    this.chatService.changeCurrentChannel(this.chatSocket, id);
  }

  async openDialogCreateIndirect(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ): Promise<void> {
    const dialogRef = this.dialog.open(CreateDialog, {
      width: "300px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {},
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.chatService.createIndirectChannel(this.chatSocket, result);
    }
  }

  async openDialogCreateDirect(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ) {
    const dialogRef = this.dialog.open(DirectDialog, {
      width: "300px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {},
    });
    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.chatService.createDirectChannel(this.chatSocket, result);
    }
  }

  async openDialogJoin(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ) {
    let test: number[] = await this.chatService.publicChannels.map(
      (channel: Channel) => channel.id
    );
    let channel = await lastValueFrom(
      this.backendService.get("/channel/allPublic")
    );

    const dialogRef = this.dialog.open(JoinDialog, {
      width: "300px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {
        channelList: channel.filter(
          (channel: Channel) => test.indexOf(channel.id) === -1
        ),
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        let foundChannel = channel.find(
          (channel: Channel) => channel.name === result.selectedChannelName
        );
        if (foundChannel) {
          this.joinChannel(foundChannel.id, result.password);
        } else {
          this.snackbarService.error(
            "Could not join channel " + result.selectedChannelName + "."
          );
        }
      }
    });
  }

  test() {
    this.chatService.currentChannel = undefined;
  }

  async joinChannel(channelID: number, password: string) {
    this.chatService.joinChannel(this.chatSocket, channelID, password);
  }

  async sendMessage() {
    if (!this.chatService.currentChannel) return;
    const message = this.messageForm.value.message;

    if (message != null && message.replace(/\s/g, "").length != 0) {
      this.chatService.sendMessage(
        this.chatSocket,
        this.chatService.currentChannel.id,
        this.user.id,
        message
      );
    }
    this.messageForm.reset();
  }

  openDialogPassword(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ): void {
    const dialogRef = this.dialog.open(PasswordDialog, {
      width: "300px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {},
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.setPassword(result);
      }
    });
  }

  async setPassword(password: string) {
    if (this.chatService.currentChannel)
      await lastValueFrom(
        this.backendService.post("/channel/password", {
          channelID: this.chatService.currentChannel.id,
          password: password,
        })
      );
  }

  async unsetPassword() {
    if (this.chatService.currentChannel)
      await lastValueFrom(
        this.backendService.post("/channel/password", {
          channelID: this.chatService.currentChannel.id,
          password: null,
        })
      );
  }

  changePrivate(channelID: number) {
    lastValueFrom(
      this.backendService.post("/channel/changePrivate", {
        channelID: channelID,
      })
    );
    if (this.chatService.currentChannel)
      this.chatService.currentChannel.private =
        !this.chatService.currentChannel.private;
  }

  getChannelList() {
    this.chatService.getAllChannels(this.chatSocket);
  }

  async getUser() {
    this.user = await lastValueFrom(this.backendService.get("/player/me"));
    this.chatService.user = this.user;
  }

  /********************************************************************\
  |*                        Friend list                               *|
  \********************************************************************/

  async getAllFriends() {
    this.allFriends = await lastValueFrom(
      this.backendService.get("/friends/all")
    );
    return;
  }

  async openAddUserDialog(
    enterAnimationDuration: string,
    exitAnimationDuration: string
  ) {
    const dialogRef = this.dialog.open(AddFriendDialog, {
      width: "250px",
      enterAnimationDuration,
      exitAnimationDuration,
      data: {},
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sendFriendRequestByUsername(result);
      }
    });
  }

  async sendFriendRequestByUsername(result: string) {
    const returnValue = await lastValueFrom(
      this.backendService.get("/friends/invitebyusername/" + result)
    );
    if (returnValue.success)
      this.notificationService.sendFriendNotification(returnValue.idInvited);
    this.snackbarService.info(returnValue.message);
    return;
  }

  async sendMessageToFriend(friend: IFriend) {
    this.changeLeftBarSelector(this.CHATS_SELECTOR);

    const chat = await lastValueFrom(
      this.backendService.post("/channel/createDirect", {
        user: friend.id,
      })
    );
    this.getChannelList();
    this.changeCurrentChannel(chat.id);
  }

  classicChallenge(idPlayer: number) {
    this.notificationService.sendChallengeNotification(
      idPlayer,
      GameType.CLASSIC
    );
    this.router.navigateByUrl("/game/play", {
      state: { id_challenged: idPlayer, type: GameType.CLASSIC },
    });
  }

  customChallenge(idPlayer: number) {
    this.notificationService.sendChallengeNotification(
      idPlayer,
      GameType.CUSTOM
    );
    this.router.navigateByUrl("/game/play", {
      state: { id_challenged: idPlayer, type: GameType.CUSTOM },
    });
  }

  async unfriend(friend: IFriend) {
    await lastValueFrom(
      this.backendService.get("/friends/delete/" + friend.id)
    );
    this.getAllFriends();
  }
}

@Component({
  selector: "join-dialog",
  templateUrl: "joinChannelModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class JoinDialog {
  selectedChannelName: string = "";
  password: string = "";
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelList: Channel[] },
    public dialogRef: MatDialogRef<JoinDialog>
  ) {}
}

@Component({
  selector: "create-dialog",
  templateUrl: "createChannelModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class CreateDialog {
  selectedChannelName: string = "";
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelList: Channel[] },
    public dialogRef: MatDialogRef<CreateDialog>
  ) {}
}

@Component({
  selector: "invite-dialog",
  templateUrl: "inviteUserModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class InviteDialog {
  selectedChannelName: string = "";
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelList: Channel[] },
    public dialogRef: MatDialogRef<InviteDialog>
  ) {}
}

@Component({
  selector: "direct-dialog",
  templateUrl: "DirectChannelModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class DirectDialog {
  selectedChannelName: string = "";
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelList: Channel[] },
    public dialogRef: MatDialogRef<DirectDialog>
  ) {}
}

@Component({
  selector: "password-dialog",
  templateUrl: "PasswordModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class PasswordDialog {
  selectedChannelName: string = "";
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelList: Channel[] },
    public dialogRef: MatDialogRef<PasswordDialog>
  ) {}
}

@Component({
  selector: "addFriend-dialog",
  templateUrl: "addFriendModal.html",
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class AddFriendDialog {
  selectedChannelName: string = "";
  constructor(public dialogRef: MatDialogRef<AddFriendDialog>) {}
}
