import { Injectable } from '@nestjs/common';
import { NotifType, PlayerNotif } from './entities/notifications.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { BlockedPlayerService } from 'src/blocked-player/blocked-player.service';
import { GameType } from 'src/game/game.config';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(PlayerNotif)
    private notifTable: Repository<PlayerNotif>,
    private blockedService: BlockedPlayerService,
  ) {}

  async getAllPlayerNotif(id_player: number): Promise<PlayerNotif[]> {
    const blockedList = await this.blockedService.findAllPlayersBlockedBy(
      id_player,
    );

    return this.notifTable.find({
      where: {
        id_player,
        id_challenger: Not(In(blockedList)),
        id_friend: Not(In(blockedList)),
      },
      relations: ['player', 'challenger', 'friend'],
      select: {
        player: {
          username: true,
        },
        challenger: {
          username: true,
        },
        friend: {
          username: true,
        },
        id_player: true,
        type: true,
        id: true,
        id_friend: true,
        id_challenger: true,
        gameType: true,
      },
      order: { time_sent: 'ASC' },
    });
  }

  async newMessageNotif(
    id_player: number,
    id_channel: number,
  ): Promise<PlayerNotif> {
    const existingNotif = await this.notifTable.findOne({
      where: { id_player, id_channel },
    });

    if (existingNotif) {
      existingNotif.nb_new_messages++;
      return await this.notifTable.save(existingNotif);
    }
    const newNotif = this.notifTable.create({
      id_player,
      type: NotifType.MSG,
      id_channel,
      nb_new_messages: 1,
    });

    return await this.notifTable.save(newNotif);
  }

  async newChallengeNotif(
    id_player: number,
    id_challenger: number,
    gameType: GameType,
  ): Promise<PlayerNotif> {
    const blockedList = await this.blockedService.findAllPlayersBlockedBy(
      id_player,
    );

    if (blockedList.includes(id_challenger)) {
      return;
    }

    const newNotif = this.notifTable.create({
      id_player,
      type: NotifType.CHALLENGE,
      id_challenger,
      gameType: gameType,
    });

    return await this.notifTable.save(newNotif);
  }

  async newFriendNotif(
    id_player: number,
    id_friend: number,
  ): Promise<PlayerNotif> {
    const blockedList = await this.blockedService.findAllPlayersBlockedBy(
      id_player,
    );

    if (blockedList.includes(id_friend)) {
      return;
    }
    const newNotif = this.notifTable.create({
      id_player,
      type: NotifType.FRIEND,
      id_friend,
    });

    return await this.notifTable.save(newNotif);
  }

  async deleteFriendNotif(
    id_player: number,
    id_friend: number,
  ): Promise<number> {
    const notif = await this.notifTable.findOne({
      where: { id_player, id_friend },
    });
    if (!notif) {
      return;
    }
    const idNotif = notif.id;
    await this.deleteNotif(idNotif, id_player);
    return idNotif;
  }

  async deleteChallengeNotif(
    id_player: number,
    id_challenger: number,
  ): Promise<number> {
    const notif = await this.notifTable.findOne({
      where: { id_player, id_challenger },
    });
    if (!notif) {
      return;
    }
    const idNotif = notif.id;
    await this.deleteNotif(idNotif, id_player);
    return idNotif;
  }

  async deleteNotif(id: number, id_player: number) {
    this.notifTable.delete({ id, id_player });
  }
}
