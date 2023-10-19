import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  Body,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  Res,
  UploadedFile,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { Player } from './entities/player.entity';
import { CreatePlayerDTO } from './dto/createPlayer.dto';
import { Public } from 'src/auth/passport/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { newUsernameDTO } from './dto/newUsername.dto';
import { GameType } from 'src/game/game.config';
import { IPlayerModeInfo } from './dto_out/IPlayerModeInfo.dto';
import { IPlayerPublicInfo } from './dto_out/IPlayerPublicInfo.dto';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('me')
  async getMe(@Request() req): Promise<Player> {
    return await this.playerService.findById(req.user.idPlayer as number);
  }

  @Get('idByName/:username')
  async getIdByName(@Param('username') username: string): Promise<any> {
    const player = await this.playerService.findByUsername(username);
    if (!player) {
      return;
    }

    return { id: player.id };
  }

  @Get('myinfos')
  async getMyInfos(@Request() req): Promise<IPlayerPublicInfo> {
    const player = await this.playerService.findById(
      req.user.idPlayer as number,
    );
    const publicInfos = this.playerService.getPlayerPublicInfo(
      player,
      req.user.idPlayer,
    );
    publicInfos.two_factor_auth = player.two_factor_auth;
    return publicInfos;
  }

  // Use for check if the user have 2FA when to be logging
  @Get('getmeByLogin')
  @Public()
  async getMeByLogin(@Body() player: CreatePlayerDTO): Promise<Player> {
    return await this.playerService.findByLogin(player.login);
  }

  @Get('addTwoFa')
  async addTwoFa(@Request() req): Promise<Player> {
    const result = this.playerService.addTwoFa(req.user.idPlayer);
    return await result;
  }

  @Get('removeTwoFA')
  async removeTwoFA(@Request() req): Promise<Player> {
    const result = this.playerService.removeTwoFA(req.user.idPlayer);
    return await result;
  }

  @Post('create')
  @UsePipes(new ValidationPipe())
  async createPlayer(@Body() player: CreatePlayerDTO): Promise<Player> {
    const result = this.playerService.create(player);
    return await result;
  }

  @Get(':id')
  @UsePipes(new ValidationPipe())
  async findById(@Param('id', new ParseIntPipe()) id: number): Promise<Player> {
    const result: Player = await this.playerService.findById(id as number);
    return result;
  }

  @Get('/byUsername/:username')
  async findByUsername(
    @Param('username') username: string,
    @Request() req,
  ): Promise<IPlayerPublicInfo> {
    const player: Player = await this.playerService.findByUsername(username);
    if (!player) {
      return;
    }
    return this.playerService.getPlayerPublicInfo(player, req.user.idPlayer);
  }

  @Get('/byId/:id')
  async getPublicInfos(
    @Param('id', new ParseIntPipe()) id: number,
    @Request() req,
  ): Promise<IPlayerPublicInfo> {
    const player: Player = await this.findById(id);
    return this.playerService.getPlayerPublicInfo(player, req.user.idPlayer);
  }

  @Get('/infos/:type/:id')
  async getModeInfos(
    @Param('type', new ParseIntPipe()) type: GameType,
    @Param('id', new ParseIntPipe()) id: number,
  ): Promise<IPlayerModeInfo> {
    const player: Player = await this.findById(id);
    return this.playerService.getPlayerModeInfo(type, player);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('photo', { dest: './avatarStorage' }))
  async uploadSingle(@Request() req, @UploadedFile() file) {
    await this.playerService.setAvatar(req.user.idPlayer, file.filename);
    return { returnValue: "It's work !" };
  }

  @Get('avatar')
  async getAvatar(@Request() req, @Res() res): Promise<any> {
    const url: string = await this.playerService.getAvatar(req.user.idPlayer);
    return res.sendFile(url, { root: './uploads' });
  }

  @Post('changeUsername')
  async changeUsername(@Request() req, @Body() player: newUsernameDTO) {
    const response = await this.playerService.changeUsername(
      player.newUsername,
      req.user.idPlayer,
    );
    if (response !== 0) return { error: response };

    return { success: true };
  }
}
