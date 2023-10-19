import { ChannelService } from './channel.service';
import { Channel } from './entities/channel.entity';
import {
  createDirectChannelDTO,
  createIndirectChannelDTO,
} from './dto/createChannel.dto';
import { sendMessageDTO } from './dto/sendMessage.dto';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { actionOnUserDTO, sendChannelIdDTO } from './dto/ChannelsRequest.dto';
import {
  ExportString,
  IChannel,
  IChannelMessage,
  IChannelUsers,
} from './channel.interface';

@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get('all')
  async getAllChannel(@Req() request): Promise<IChannel[]> {
    const user: number = request.user.idPlayer;
    return await this.channelService.getAllChannel(user);
  }

  @Get('usernameDirectChannel/:id')
  @UsePipes(new ValidationPipe())
  async getOtherPlayerName(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request,
  ): Promise<ExportString> {
    return await this.channelService.getOtherPlayerName(
      request.user.idPlayer,
      id,
    );
  }

  @Post('createDirect')
  @UsePipes(new ValidationPipe())
  async createDirectChannel(@Req() request): Promise<any> {
    const createChannelBody: createDirectChannelDTO = request.body;
    const user: number = request.user.idPlayer;
    const channel: IChannel = await this.channelService.createDirectChannel(
      user,
      createChannelBody.user,
    );
    return channel;
  }

  @Get('allPublic')
  async getAllPublicChannel(@Req() request): Promise<IChannel[]> {
    return await this.channelService.getAllPublicChannel(request.user.idPlayer);
  }

  @Get('channelUsers/:id')
  @UsePipes(new ValidationPipe())
  async getPlayersFromChannel(
    @Param('id', new ParseIntPipe()) id: number,
  ): Promise<IChannelUsers[]> {
    return await this.channelService.getUsersFromChannel(id);
  }

  @Post('message')
  @UsePipes(new ValidationPipe())
  async sendMessage(@Req() request) {
    const sendMessageBody: sendMessageDTO = request.body;
    const user: number = request.user.idPlayer;
    const message = await this.channelService.createChannelMessage(
      sendMessageBody,
      user,
    );
  }

  @Post('changePrivate')
  @UsePipes(new ValidationPipe())
  async changePrivate(@Req() request) {
    const setPrivateBody: sendChannelIdDTO = {
      channelID: request.body.channelID,
    };
    this.channelService.changePrivate(
      request.user.idPlayer,
      setPrivateBody.channelID,
    );
  }

  @Post('mute')
  @UsePipes(new ValidationPipe())
  async muteUser(@Req() request) {
    const muteUserBody: actionOnUserDTO = {
      channelID: request.body.channelID,
      user: request.body.user,
    };
    this.channelService.muteUserFromChannel(
      request.user.idPlayer,
      muteUserBody.user,
      muteUserBody.channelID,
    );
  }

  @Post('password')
  @UsePipes(new ValidationPipe())
  async setPassword(@Req() request) {
    const setPasswordBody = request.body;
    this.channelService.setPasswordChannel(
      request.user.idPlayer,
      setPasswordBody.password,
      setPasswordBody.channelID,
    );
  }

  @Post('setAdmin')
  @UsePipes(new ValidationPipe())
  async setAdmin(@Req() request) {
    const setAdminBody: actionOnUserDTO = {
      channelID: request.body.channelID,
      user: request.body.user,
    };
    this.channelService.setAdmin(
      request.user.idPlayer,
      setAdminBody.channelID,
      setAdminBody.user,
    );
  }
}
