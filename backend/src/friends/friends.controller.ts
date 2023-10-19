import { Controller, Get, Param, ParseIntPipe, Request } from '@nestjs/common';
import { Friends } from './entities/friends.entity';
import { FriendsService } from './friends.service';
import { PlayerService } from 'src/player/player.service';

@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private playerService: PlayerService,
  ) {}

  @Get('/all/')
  async getAllFriends(@Request() req): Promise<Friends[]> {
    return await this.friendsService.findAllFriends(req.user.idPlayer);
  }

  @Get('/current/:id/')
  async findCurrent(
    @Param('id', new ParseIntPipe()) id: number,
    @Request() req,
  ): Promise<Friends> {
    return await this.friendsService.findByBothId(id, req.user.idPlayer);
  }

  @Get('invitebyusername/:username')
  async inviteFriendByUsername(
    @Param('username') username: string,
    @Request() req,
  ) {
    const idInvited = await this.playerService.getPlayerIdByUsername(username);
    if (idInvited === -1)
      return {
        success: false,
        message: '[ERROR] User: ' + username + " doesn't exist.",
      };
    else if (idInvited === req.user.idPlayer)
      return {
        success: false,
        message: "[ERROR] you can't add yourself as a friend.",
      };
    const isAlreadyFriend = await this.friendsService.findByBothId(
      req.user.idPlayer,
      idInvited,
    );
    if (isAlreadyFriend)
      return { success: false, message: '[ERROR] you are already friends.' };
    await this.friendsService.inviteFriendByUsername(
      req.user.idPlayer,
      idInvited,
    );
    return {
      success: true,
      idInvited: idInvited,
      message: 'A friend request has been sent to ' + username,
    };
  }

  @Get('/invite/:id')
  async inviteFriend(
    @Param('id', new ParseIntPipe()) id: number,
    @Request() req,
  ): Promise<Friends> {
    const friends: Friends = await this.friendsService.findByBothId(
      id,
      req.user.idPlayer,
    );
    if (friends) {
      return friends;
    }
    return await this.friendsService.inviteFriend(req.user.idPlayer, id);
  }

  @Get('/accept/:id')
  async acceptInvite(
    @Param('id', new ParseIntPipe()) id: number,
    @Request() req,
  ): Promise<Friends> {
    const friends: Friends = await this.friendsService.findByBothId(
      id,
      req.user.idPlayer,
    );
    if (!friends || friends.id_invited != req.user.idPlayer) {
      return;
    }
    return await this.friendsService.acceptInvite(friends);
  }

  @Get('/delete/:id')
  async deleteInvite(
    @Param('id', new ParseIntPipe()) id: number,
    @Request() req,
  ) {
    const friends: Friends = await this.friendsService.findByBothId(
      id,
      req.user.idPlayer,
    );
    if (!friends) {
      return;
    }
    await this.friendsService.deleteInvite(friends);
  }
}
