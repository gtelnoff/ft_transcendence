import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { NotifClientEndpoints } from './notification.config';
import { NotificationsService } from 'src/notifications/notifications.service';
import { GameType } from 'src/game/game.config';
import { Socket } from 'socket.io';
import { GameService } from 'src/game/game.service';
import { PlayerService } from 'src/player/player.service';
import { ChatClientEndpoints } from '../chat/chat.config';

@Injectable()
export class NotificationSocketService {
  constructor(
    private readonly notifService: NotificationsService,
    @Inject(PlayerService)
    private readonly playerService: PlayerService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
  ) {}

  private logger: Logger = new Logger('SocketService');
  private idPlayerToSocketMap = new Map<number, Socket[]>();
  private playerToWatchingSockets = new Map<number, Socket[]>();
  private socketToWatchedPlayers = new Map<string, number[]>();
  private socketToPlayer = new Map<string, number>();

  public addClientToPlayer(client: Socket, idPlayer: number) {
    if (this.idPlayerToSocketMap.has(idPlayer)) {
      if (!this.idPlayerToSocketMap.get(idPlayer).includes(client)) {
        this.idPlayerToSocketMap.get(idPlayer).push(client);
      }
    } else {
      this.newPlayerStatus(idPlayer, 'online');
      this.idPlayerToSocketMap.set(idPlayer, [client]);
    }
    if (!this.socketToPlayer.has(client.id)) {
      this.socketToPlayer.set(client.id, idPlayer);
    } else {
      this.logger.log('Socket already match a player');
    }
  }

  public disconnect(client: Socket) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player linked to socket not found');
      return;
    }
    let sockets = this.idPlayerToSocketMap.get(idPlayer);
    if (!sockets) {
      this.logger.log('ERROR : No sockets found for player ' + idPlayer);
      return;
    }
    if (sockets.includes(client)) {
      this.idPlayerToSocketMap.set(
        idPlayer,
        sockets.filter((socket) => socket.id !== client.id),
      );
    } else {
      this.logger.log(
        'ERROR : Socket not found in linked sockets for player ' + idPlayer,
      );
      return;
    }
    this.clearPlayersWatched(client);
    sockets = this.idPlayerToSocketMap.get(idPlayer);
    if (!sockets || sockets.length === 0) {
      this.idPlayerToSocketMap.delete(idPlayer);
      this.newPlayerStatus(idPlayer, 'offline');
    }
    this.socketToPlayer.delete(client.id);
  }

  newPlayerStatus(idPlayer: number, status: string) {
    const socketsWatching = this.playerToWatchingSockets.get(idPlayer);
    if (socketsWatching) {
      for (const socket of socketsWatching) {
        socket.emit(NotifClientEndpoints.UPDATE_PLAYER_STATUS, {
          id: idPlayer,
          status: status,
        });
      }
    }
  }

  watchPlayer(socket: Socket, idPlayer: number) {
    const playerWatched = this.playerToWatchingSockets.get(idPlayer);
    if (playerWatched) {
      if (!playerWatched.find((s) => s == socket)) {
        this.playerToWatchingSockets.get(idPlayer).push(socket);
      }
    } else {
      this.playerToWatchingSockets.set(idPlayer, [socket]);
    }

    if (this.socketToWatchedPlayers.has(socket.id)) {
      if (
        !this.socketToWatchedPlayers
          .get(socket.id)
          .find((id) => id === idPlayer)
      ) {
        this.socketToWatchedPlayers.get(socket.id).push(idPlayer);
      }
    } else {
      this.socketToWatchedPlayers.set(socket.id, [idPlayer]);
    }
    this.logger.log(
      'Socket ' + socket.id + ' is now watching player ' + idPlayer + ' status',
    );
    socket.emit(ChatClientEndpoints.UPDATE_PLAYER_STATUS, {
      id: idPlayer,
      status: this.checkPlayerStatusById(idPlayer),
    });
  }

  unwatchPlayer(socket: Socket, idPlayer: number) {
    const watchingSockets = this.playerToWatchingSockets.get(idPlayer);
    if (watchingSockets) {
      this.playerToWatchingSockets.set(
        idPlayer,
        watchingSockets.filter((s) => s === socket),
      );
    }

    const watchedPlayers = this.socketToWatchedPlayers.get(socket.id);
    if (watchedPlayers) {
      this.socketToWatchedPlayers.set(
        socket.id,
        watchedPlayers.filter((id) => id === idPlayer),
      );
    }
  }

  clearPlayersWatched(socket: Socket) {
    const playerWatched = this.socketToWatchedPlayers.get(socket.id);
    if (playerWatched) {
      for (const id of playerWatched) {
        if (this.playerToWatchingSockets.get(id)) {
          this.playerToWatchingSockets.set(
            id,
            this.playerToWatchingSockets.get(id).filter((s) => s === socket),
          );
        }
      }

      this.socketToWatchedPlayers.delete(socket.id);
    }
  }

  public checkPlayerStatusById(idToCheck: number) {
    const sockets = this.idPlayerToSocketMap.get(idToCheck);
    if (sockets && sockets.length > 0) {
      if (this.gameService.isPlayerInGame(idToCheck)) {
        return 'ingame';
      } else {
        return 'online';
      }
    } else {
      return 'offline';
    }
  }

  public async checkPlayerStatusByName(nameToCheck: string) {
    const idToCheck = await this.playerService.getPlayerIdByUsername(
      nameToCheck,
    );
    return this.checkPlayerStatusById(idToCheck);
  }

  public async addFriend(client: Socket, id_invited: number) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }
    const notif = await this.notifService.newFriendNotif(id_invited, idPlayer);
    if (!notif) {
      return;
    }
    const invitedSockets = this.idPlayerToSocketMap.get(id_invited);
    if (!invitedSockets) {
      return;
    }
    invitedSockets.forEach((socket) => {
      socket.emit(NotifClientEndpoints.NEW_NOTIFICATION, notif);
    });
  }

  public async cancelFriend(client: Socket, id_invited: number) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }
    const idNotif = await this.notifService.deleteFriendNotif(
      id_invited,
      idPlayer,
    );
    const invitedSockets = this.idPlayerToSocketMap.get(id_invited);
    if (!invitedSockets) {
      return;
    }
    invitedSockets.forEach((socket) => {
      socket.emit(NotifClientEndpoints.DELETE_NOTIFICATION, idNotif);
    });
  }

  public async addChallenge(
    client: Socket,
    id_challenged: number,
    gameType: GameType,
  ) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }
    const notif = await this.notifService.newChallengeNotif(
      id_challenged,
      idPlayer,
      gameType,
    );
    if (!notif) {
      return;
    }
    const invitedSockets = this.idPlayerToSocketMap.get(id_challenged);
    if (!invitedSockets) {
      return;
    }
    invitedSockets.forEach((socket) => {
      socket.emit(NotifClientEndpoints.NEW_NOTIFICATION, notif);
    });
  }

  public async cancelChallenge(id_player: number, id_challenged: number) {
    const idNotif = await this.notifService.deleteChallengeNotif(
      id_challenged,
      id_player,
    );
    const challengedSockets = this.idPlayerToSocketMap.get(id_challenged);
    if (!challengedSockets) {
      return;
    }
    challengedSockets.forEach((socket) => {
      socket.emit(NotifClientEndpoints.DELETE_NOTIFICATION, idNotif);
    });
  }

  public async refuseChallenge(client: Socket, id_challenger: number) {
    const id_player = this.socketToPlayer.get(client.id);
    if (!id_player) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }

    await this.notifService.deleteChallengeNotif(id_player, id_challenger);
    await this.gameService.cancelChallenge(id_player, id_challenger);
  }

  public async getAllNotifications(client: Socket) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }
    const allNotifs = await this.notifService.getAllPlayerNotif(idPlayer);
    allNotifs.forEach((notif) => {
      client.emit(NotifClientEndpoints.NEW_NOTIFICATION, notif);
    });
  }

  public async deleteNotification(client: Socket, id_notif: number) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('ERROR : Player not found for socket ' + client.id);
      return;
    }
    await this.notifService.deleteNotif(id_notif, idPlayer);
  }
}
