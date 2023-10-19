import { Injectable } from '@nestjs/common';
import { Friends } from './entities/friends.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { PlayerService } from 'src/player/player.service';

@Injectable()
export class FriendsService {
  constructor(
    private playerService: PlayerService,
    @InjectRepository(Friends)
    private friendsTable: Repository<Friends>,
  ) {}

  async findAllFriends(idPlayer: number): Promise<any[]> {
    const friends = await this.friendsTable.find({
      where: [
        { id_invited: idPlayer, time_accepted: Not(IsNull()) },
        { id_player: idPlayer, time_accepted: Not(IsNull()) },
      ],
      relations: ['player', 'invited'],
    });

    return friends.map((friend) => {
      return {
        id:
          friend.id_player === idPlayer ? friend.invited.id : friend.player.id,
        login:
          friend.id_player === idPlayer
            ? friend.invited.login
            : friend.player.login,
        username:
          friend.id_player === idPlayer
            ? friend.invited.username
            : friend.player.username,
        avatarPath:
          friend.id_player === idPlayer
            ? friend.invited.avatar_path
            : friend.player.avatar_path,
      };
    });
  }

  async findByBothId(idPlayer1: number, idPlayer2: number) {
    return await this.friendsTable.findOne({
      where: [
        {
          id_invited: idPlayer1,
          id_player: idPlayer2,
        },
        {
          id_invited: idPlayer2,
          id_player: idPlayer1,
        },
      ],
    });
  }

  async inviteFriend(idPlayer1: number, idPlayer2: number) {
    const newFriends: Friends = this.friendsTable.create({
      id_player: idPlayer1,
      id_invited: idPlayer2,
    });

    return await this.friendsTable.save(newFriends);
  }

  async acceptInvite(friends: Friends): Promise<Friends> {
    friends.time_accepted = new Date();
    return await this.friendsTable.save(friends);
  }

  async deleteInvite(friends: Friends) {
    await this.friendsTable.delete({
      id_player: friends.id_player,
      id_invited: friends.id_invited,
    });
  }

  async inviteFriendByUsername(idPlayer1: number, idPlayer2: number) {
    const newFriends: Friends = this.friendsTable.create({
      id_player: idPlayer1,
      id_invited: idPlayer2,
    });

    return await this.friendsTable.save(newFriends);
  }
}
