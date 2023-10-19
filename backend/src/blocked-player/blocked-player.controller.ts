import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { BlockedPlayerService } from './blocked-player.service';
import { Blocked } from './entities/blockedPlayer.entity';
import { Friends } from 'src/friends/entities/friends.entity';
import { FriendsService } from 'src/friends/friends.service';

@Controller('blocked')
export class BlockedPlayerController {
  constructor(
    private readonly blockedPlayerService: BlockedPlayerService,
    private readonly friendsService: FriendsService,
  ) {}

  @Get('/byUser/:id')
  async findBlockedPlayerByUser(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() req,
  ): Promise<Blocked> {
    return await this.blockedPlayerService.findBlockedPlayer(
      req.user.idPlayer,
      id,
    );
  }

  @Get('/isUserBlockedBy/:id')
  async findIfUserIsBlockedByPlayer(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() req,
  ): Promise<Blocked> {
    return await this.blockedPlayerService.findBlockedPlayer(
      id,
      req.user.idPlayer,
    );
  }

  @Get('/block/:id')
  async blockPlayer(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() req,
  ): Promise<Blocked> {
    const blocked: Blocked = await this.blockedPlayerService.findBlockedPlayer(
      req.user.idPlayer,
      id,
    );
    if (blocked) {
      return blocked;
    }
    const friends: Friends = await this.friendsService.findByBothId(
      id,
      req.user.idPlayer,
    );
    if (friends) {
      await this.friendsService.deleteInvite(friends);
    }
    return await this.blockedPlayerService.createBlockedPlayer(
      req.user.idPlayer,
      id,
    );
  }

  @Get('/unblock/:id')
  async unblockPlayer(@Param('id', new ParseIntPipe()) id: number, @Req() req) {
    const blocked: Blocked = await this.blockedPlayerService.findBlockedPlayer(
      req.user.idPlayer,
      id,
    );
    if (!blocked) {
      return;
    }
    return await this.blockedPlayerService.deleteBlockedPlayer(
      req.user.idPlayer,
      id,
    );
  }
}
