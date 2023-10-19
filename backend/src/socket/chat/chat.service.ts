import { Injectable, Logger } from '@nestjs/common';
import { ChannelMessage, ChatClientEndpoints } from './chat.config';
import { ChannelService } from 'src/channel/channel.service';
import { Socket } from 'socket.io';
import { IChannel, IChannelUsers } from 'src/channel/channel.interface';
import { Player } from 'src/player/entities/player.entity';
import { PlayerService } from 'src/player/player.service';
import { BlockedPlayerService } from 'src/blocked-player/blocked-player.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {
  constructor(
    private readonly channelService: ChannelService,
    private readonly playerService: PlayerService,
    private readonly blockedPlayerService: BlockedPlayerService,
    @InjectRepository(Player)
    private playerTable: Repository<Player>,
  ) {}

  private logger: Logger = new Logger('ChatService');
  private socketMap = new Map<number, Socket[]>();
  private socketToPlayer = new Map<string, number>();

  public identification(client: Socket, idPlayer: number) {
    if (this.socketMap.has(idPlayer)) {
      if (!this.socketMap.get(idPlayer).includes(client)) {
        this.socketMap.get(idPlayer).push(client);
      }
    } else {
      this.socketMap.set(idPlayer, [client]);
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
    let sockets = this.socketMap.get(idPlayer);
    if (!sockets) {
      this.logger.log('ERROR : No sockets found for player ' + idPlayer);
      return;
    }
    if (sockets.includes(client)) {
      this.socketMap.set(
        idPlayer,
        sockets.filter((socket) => socket.id !== client.id),
      );
    } else {
      this.logger.log(
        'ERROR : Socket not found in linked sockets for player ' + idPlayer,
      );
      return;
    }
    sockets = this.socketMap.get(idPlayer);
    if (!sockets || sockets.length === 0) {
      this.socketMap.delete(idPlayer);
    }
    this.socketToPlayer.delete(client.id);
  }

  public async getAllChannels(client: Socket) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log(
        'getAllChannels : Player not found for socket ' + client.id,
      );
      return;
    }
    const channelList = await this.channelService.getAllChannel(idPlayer);
    for (const channel of channelList) {
      if (channel.is_direct) {
        channel.name = (
          await this.channelService.getOtherPlayerName(idPlayer, channel.id)
        )?.string;
      }
    }
    client.emit(ChatClientEndpoints.UPDATE_CHANNEL_LIST, channelList);
  }

  async createDirectChannel(client: Socket, user2: string) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log(
        'createDirectChannel : Player not found for socket ' + client.id,
      );
      return;
    }
    const id_user2: number = await this.playerService.getPlayerIdByUsername(
      user2,
    );
    if (id_user2 < 0 || id_user2 == idPlayer) return;
    const channel: IChannel = await this.channelService.createDirectChannel(
      idPlayer,
      id_user2,
    );

    if (!channel) return;
    const channelUsers: Player[] = await this.playerTable.find({
      select: { id: true, username: true },
      relations: { channelPlayers: true },
      where: { channelPlayers: { id_channel: channel.id } },
    });

    if (!channelUsers && channelUsers.length != 2) return;

    for (const user of channelUsers) {
      const sockets: Socket[] = this.socketMap.get(user.id);
      if (!sockets) return;
      channel.name =
        (await this.channelService.getOtherPlayerName(user.id, channel.id))
          ?.string ?? 'unkown';
      sockets?.forEach((socket) => {
        socket.emit(ChatClientEndpoints.NEW_CHANNEL, channel);
      });
    }
  }

  async createIndirectChannel(client: Socket, name: string) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log(
        'createIndirectChannel : Player not found for socket ' + client.id,
      );
      return;
    }
    const channel: IChannel = await this.channelService.createIndirectChannel(
      name,
      idPlayer,
    );
    if (!channel) return;
    const channelUsers: Player[] = await this.playerTable.find({
      select: { id: true, username: true },
      relations: { channelPlayers: true },
      where: { channelPlayers: { id_channel: channel.id } },
    });

    for (const user of channelUsers) {
      const sockets: Socket[] = this.socketMap.get(user.id);
      if (!sockets) return;
      sockets.forEach((socket) => {
        socket.emit(ChatClientEndpoints.NEW_CHANNEL, channel);
      });
    }
  }

  async joinChannel(client: Socket, channelID: number, password: string) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('joinChannel : Player not found for socket ' + client.id);
      return;
    }
    const channel: IChannel = await this.channelService.joinChannel(
      idPlayer,
      channelID,
      password,
    );
    if (!channel) return;
    const sockets: Socket[] = this.socketMap.get(idPlayer);
    sockets?.forEach((socket) => {
      socket.emit(ChatClientEndpoints.NEW_CHANNEL, channel);
    });

    const channelUsers: IChannelUsers[] =
      await this.channelService.getUsersFromChannel(channelID);
    const index = channelUsers.findIndex(
      (channelUser) => channelUser.id == idPlayer,
    );
    const newuser: IChannelUsers = channelUsers[index];
    channelUsers.splice(index, 1);
    {
      channelUsers?.forEach((channelUser) => {
        const sockets: Socket[] = this.socketMap.get(channelUser.id);
        sockets?.forEach((socket) =>
          socket.emit(ChatClientEndpoints.ADD_CHANNEL_USER, {
            user: newuser,
            channelID: channelID,
          }),
        );
      });
    }
  }

  async kickUser(client: Socket, userToKick: number, channelID: number) {
    const userWhoKick = this.socketToPlayer.get(client.id);
    if (!userWhoKick) {
      this.logger.log('kickUser : Player not found for socket ' + client.id);
      return;
    }
    const userKicked: boolean = await this.channelService.kickUserFromChannel(
      userWhoKick,
      userToKick,
      channelID,
    );
    if (!userKicked) return;
    const sockets: Socket[] = this.socketMap.get(userToKick);
    sockets?.forEach((socket) => {
      socket.emit(ChatClientEndpoints.REMOVE_CHANNEL, channelID);
    });
    const channelUsers: IChannelUsers[] =
      await this.channelService.getUsersFromChannel(channelID);
    {
      channelUsers?.forEach((channelUser) => {
        const sockets: Socket[] = this.socketMap.get(channelUser.id);
        sockets?.forEach((socket) =>
          socket.emit(ChatClientEndpoints.REMOVE_CHANNEL_USER, {
            user: userToKick,
            channelID: channelID,
          }),
        );
      });
    }
  }

  async banUser(client: Socket, userToBan: number, channelID: number) {
    const userWhoBan = this.socketToPlayer.get(client.id);
    if (!userWhoBan) {
      this.logger.log('banUser : Player not found for socket ' + client.id);
      return;
    }
    const userBanned: boolean = await this.channelService.banUserFromChannel(
      userWhoBan,
      userToBan,
      channelID,
    );
    if (!userBanned) return;
    const sockets: Socket[] = this.socketMap.get(userToBan);
    sockets?.forEach((socket) => {
      socket.emit(ChatClientEndpoints.REMOVE_CHANNEL, channelID);
    });
    const channelUsers: IChannelUsers[] =
      await this.channelService.getUsersFromChannel(channelID);
    {
      channelUsers?.forEach((channelUser) => {
        const sockets: Socket[] = this.socketMap.get(channelUser.id);
        sockets?.forEach((socket) =>
          socket.emit(ChatClientEndpoints.REMOVE_CHANNEL_USER, {
            user: userToBan,
            channelID: channelID,
          }),
        );
      });
    }
  }

  async inviteUser(client: Socket, userToInvite: number, channelID: number) {
    const userWhoInvite = this.socketToPlayer.get(client.id);
    const channel = await this.channelService.findChannelById(channelID);
    if (!channel) return;
    const ret_channel: IChannel = {
      id: channel.id,
      id_owner: channel.id_owner,
      name: channel.name,
      private: channel.private,
      is_direct: channel.is_direct,
    };
    if (!userWhoInvite) {
      this.logger.log('inviteUser : Player not found for socket ' + client.id);
      return;
    }
    const userBanned: IChannelUsers = await this.channelService.inviteUser(
      userWhoInvite,
      channelID,
      userToInvite,
    );
    if (!userBanned) return;
    const sockets: Socket[] = this.socketMap.get(userToInvite);
    if (sockets) {
      sockets?.forEach((socket) => {
        socket.emit(ChatClientEndpoints.NEW_CHANNEL, ret_channel);
      });
    }

    const channelUsers: IChannelUsers[] =
      await this.channelService.getUsersFromChannel(channelID);
    const index = channelUsers.findIndex(
      (channelUser) => channelUser.id == userToInvite,
    );
    const newuser: IChannelUsers = channelUsers[index];
    channelUsers.splice(index, 1);
    {
      channelUsers?.forEach((channelUser) => {
        const sockets: Socket[] = this.socketMap.get(channelUser.id);
        sockets?.forEach((socket) =>
          socket.emit(ChatClientEndpoints.ADD_CHANNEL_USER, {
            user: newuser,
            channelID: channelID,
          }),
        );
      });
    }
  }

  ///////////////////////////// MESSAGES /////////////////////////////
  public async getChannelMessages(client: Socket, channelID: number) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log(
        'getChannelMessages : Player not found for socket ' + client.id,
      );
      return;
    }

    const channel = await this.channelService.findChannelById(channelID);
    if (!channel) {
      return;
    }

    const messages = await this.channelService.getMessagesFromChannel(
      idPlayer,
      {
        channelID: channelID,
      },
    );
    client.emit(ChatClientEndpoints.UPDATE_CHANNEL_MESSAGES, messages);
  }

  private createReturnMessage(message: any) {
    return {
      id: message.id,
      time_posted: message.time_posted,
      id_channel: message.channelPlayer.channel.id,
      id_player: message.channelPlayer.player.id,
      content: message.content,
      name: message.channelPlayer.player.username,
      avatar_path: message.channelPlayer.player.avatar_path,
    };
  }

  public async sendMessage(client: Socket, message: ChannelMessage) {
    const idPlayer = this.socketToPlayer.get(client.id);
    if (!idPlayer) {
      this.logger.log('sendMessage : Player not found for socket ' + client.id);
      return;
    }
    const channel = await this.channelService.findChannelById(
      message.id_channel,
    );
    if (!channel) {
      return;
    }

    const savedMessage = await this.channelService.createChannelMessage(
      message,
      idPlayer,
    );
    if (savedMessage) {
      const channelUsers = await this.channelService.getUsersFromChannel(
        message.id_channel,
      );
      const channelUsersIds = channelUsers.map((user) => user.id);
      const returnMessage = this.createReturnMessage(savedMessage);
      this.socketMap?.forEach(async (clientSockets, userId) => {
        if (
          channelUsersIds.includes(userId) &&
          !(await this.blockedPlayerService.findBlockedPlayer(userId, idPlayer))
        ) {
          clientSockets?.forEach((socket) => {
            socket.emit(ChatClientEndpoints.NEW_MESSAGE, returnMessage);
          });
        }
      });
    } else {
      this.logger.log('Message not saved');
    }
  }
}
