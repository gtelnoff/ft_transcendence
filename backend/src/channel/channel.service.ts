import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelPlayer } from './entities/channelPlayer.entity';
import { PlayerService } from 'src/player/player.service';
import { Player } from 'src/player/entities/player.entity';
import { ChannelMessage, MessageType } from './entities/channelMessage.entity';
import {
  createDirectChannelDTO,
  createIndirectChannelDTO,
} from './dto/createChannel.dto';
import { sendMessageDTO } from './dto/sendMessage.dto';
import {
  ChannelUsers,
  ExportString,
  IChannel,
  IChannelMessage,
  IChannelUsers,
} from './channel.interface';
import { sendChannelIdDTO } from './dto/ChannelsRequest.dto';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private channelTable: Repository<Channel>,
    @InjectRepository(ChannelPlayer)
    private channelPlayerTable: Repository<ChannelPlayer>,
    @InjectRepository(ChannelMessage)
    private channelMessageTable: Repository<ChannelMessage>,
    @InjectRepository(Player)
    private playerTable: Repository<Player>,
    @Inject(PlayerService)
    private playerService: PlayerService,
  ) {}

  async isDirectChannel(channelID: number): Promise<boolean> {
    const channel: Channel = await this.channelTable.findOne({
      select: {
        is_direct: true,
      },
      where: {
        id: channelID,
      },
    });
    if (!channel || channel.is_direct) return true;
    return false;
  }

  async findChannelById(id: number): Promise<Channel> {
    return await this.channelTable.findOne({ where: { id } });
  }

  async findChannelByName(name: string): Promise<Channel> {
    return await this.channelTable.findOne({ where: { name } });
  }

  async getAllChannel(user: number): Promise<IChannel[]> {
    const channels: IChannel[] = await this.channelTable.find({
      select: {
        id: true,
        id_owner: true,
        name: true,
        private: true,
        is_direct: true,
      },
      where: {
        channelPlayers: {
          id_player: user,
          time_kicked_until: IsNull(),
          time_banned_until: IsNull(),
        },
      },
    });
    return channels;
  }

  async getOtherPlayerName(
    user: number,
    channelID: number,
  ): Promise<ExportString> {
    const channelPlayer: ChannelPlayer[] = await this.channelPlayerTable.find({
      select: {
        id_player: true,
      },
      where: {
        id_channel: channelID,
      },
    });
    for (let i: number = 0; i < channelPlayer.length; i++) {
      if (channelPlayer[i].id_player !== user) {
        let player: Player = await this.playerTable.findOne({
          where: { id: channelPlayer[i].id_player },
        });
        let username: string = '';
        if (player) username = player.username;
        else username = 'unknown';
        let ret: ExportString = {
          string: username,
        };
        return ret;
      }
    }
  }

  async getAllPublicChannel(user: number) {
    const channels: Channel[] = await this.channelTable.find({
      relations: {
        channelPlayers: true,
      },
      where: [
        {
          private: false,
          channelPlayers: {
            id_player: Not(user),
            time_banned_until: IsNull(),
          },
        },
        {
          private: false,
          channelPlayers: {
            id_player: user,
            time_kicked_until: Not(IsNull()),
            time_banned_until: IsNull(),
          },
        },
      ],
    });
    return channels;
  }

  async getUsersFromChannel(channelID: number): Promise<IChannelUsers[]> {
    let channelUsers: IChannelUsers[] = [];
    const channel: Channel = await this.findChannelById(channelID);
    let channel_owner: number;
    if (channel) channel_owner = channel.id_owner;
    else return null;
    const players: Player[] = await this.playerTable.find({
      select: {
        id: true,
        login: true,
        username: true,
      },
      relations: {
        channelPlayers: true,
      },
      where: {
        channelPlayers: {
          id_channel: channelID,
          time_kicked_until: IsNull(),
          time_banned_until: IsNull(),
        },
      },
    });

    if (!players) return null;
    for (let i: number = 0; i < players.length; i++) {
      let channelUser: IChannelUsers = {
        admin: (
          await this.channelPlayerTable.findOne({
            select: {
              admin: true,
            },
            where: {
              id_player: players[i].id,
              id_channel: channelID,
            },
          })
        ).admin,

        id: players[i].id,
        login: players[i].login,
        username: players[i].username,
        is_owner: false,
      };

      if (players[i].id === channel_owner) channelUser.is_owner = true;
      channelUsers.push(channelUser);
    }
    return channelUsers;
  }

  async setPasswordChannel(user: number, password: string, channelID: number) {
    let channel: Channel = await this.findChannelById(channelID);
    if (!channel || user != channel.id_owner || channel.is_direct) return;
    if (password) {
      const { createHash } = await import('node:crypto');
      const hash = createHash('sha256');
      password = hash.update(password).digest('hex');
    }
    channel.password = password;
    this.channelTable.save(channel);
  }

  async setAdmin(user: number, channelID: number, userToSet: number) {
    let channel: Channel = await this.findChannelById(channelID);
    let userToSetAdmin: ChannelPlayer = await this.channelPlayerTable.findOne({
      relations: {
        player: true,
        channel: true,
      },
      where: {
        player: {
          id: userToSet,
        },
        channel: {
          id: channelID,
        },
      },
    });
    if (!channel || channel.is_direct || !userToSetAdmin) return;
    if (user == channel.id_owner && user != userToSetAdmin.id_player) {
      userToSetAdmin.admin = !userToSetAdmin.admin;
      this.channelPlayerTable.save(userToSetAdmin);
    }
  }

  async kickUserFromChannel(
    userWhoKick: number,
    userToKick: number,
    channelID: number,
  ): Promise<boolean> {
    const time = new Date();
    const channel: Channel = await this.channelTable.findOne({
      where: { id: channelID },
    });
    const channelPlayerWhoKick: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userWhoKick,
          },
          channel: {
            id: channelID,
          },
        },
      });
    let channelKickedPlayer: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userToKick,
          },
          channel: {
            id: channelID,
          },
        },
      });
    if (
      !channel ||
      !channelKickedPlayer ||
      !channelPlayerWhoKick ||
      (await this.isDirectChannel(channelID))
    )
      return false;
    else if (
      userWhoKick == channel.id_owner ||
      userWhoKick == userToKick ||
      (channelPlayerWhoKick.admin == true && channelKickedPlayer.admin == false)
    ) {
      channelKickedPlayer.time_kicked_until = time;
      this.channelPlayerTable.save(channelKickedPlayer);
      return true;
    }
    return false;
  }

  async banUserFromChannel(
    userWhoBan: number,
    userToBan: number,
    channelID: number,
  ) {
    const time = new Date();
    const channel: Channel = await this.channelTable.findOne({
      select: { id_owner: true },
      where: { id: channelID },
    });
    const channelPlayerWhoBan: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userWhoBan,
          },
          channel: {
            id: channelID,
          },
        },
      });
    let channelBannedPlayer: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userToBan,
          },
          channel: {
            id: channelID,
          },
        },
      });
    if (
      !channel ||
      !channelBannedPlayer ||
      !channelPlayerWhoBan ||
      (await this.isDirectChannel(channelID))
    )
      return false;
    else if (
      userWhoBan == channel.id_owner ||
      (channelPlayerWhoBan.admin == true && channelBannedPlayer.admin == false)
    ) {
      channelBannedPlayer.time_banned_until = time;
      this.channelPlayerTable.save(channelBannedPlayer);
      return true;
    }
    return false;
  }

  async muteUserFromChannel(
    userWhoMute: number,
    userToMute: number,
    channelID: number,
  ) {
    const time = new Date();
    const channel: Channel = await this.channelTable.findOne({
      select: { id_owner: true },
      where: { id: channelID },
    });
    const channelPlayerWhoMute: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userWhoMute,
          },
          channel: {
            id: channelID,
          },
        },
      });
    let channelMutedPlayer: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userToMute,
          },
          channel: {
            id: channelID,
          },
        },
      });
    if (
      !channel ||
      !channelPlayerWhoMute ||
      !channelMutedPlayer ||
      (await this.isDirectChannel(channelID))
    )
      return;
    else if (
      userWhoMute == channel.id_owner ||
      (channelPlayerWhoMute.admin == true && channelMutedPlayer.admin == false)
    ) {
      channelMutedPlayer.time_muted_until = time;
      this.channelPlayerTable.save(channelMutedPlayer);
    }
  }

  async joinChannel(
    user: number,
    channelID: number,
    password: string,
  ): Promise<IChannel> {
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256');
    let channel: Channel = await this.findChannelById(channelID);
    let channelPlayer: ChannelPlayer = await this.channelPlayerTable.findOne({
      relations: {
        player: true,
        channel: true,
      },
      where: {
        player: {
          id: user,
        },
        channel: {
          id: channelID,
        },
      },
    });
    if (!channel || channel.is_direct) return null;
    const ret_channel: IChannel = {
      id: channel.id,
      id_owner: user,
      name: channel.name,
      is_direct: channel.is_direct,
      private: channel.private,
    };
    if (
      channelPlayer &&
      channelPlayer.time_kicked_until &&
      !channelPlayer.time_banned_until &&
      (!channel.password ||
        hash.update(password).digest('hex') == channel.password)
    ) {
      channelPlayer.time_kicked_until = null;
      await this.channelPlayerTable.save(channelPlayer);
      return ret_channel;
    } else if (
      channelPlayer == null &&
      (!channel.password ||
        hash.update(password).digest('hex') == channel.password)
    ) {
      await this.createChannelPlayer(channel, user);
      return ret_channel;
    }
    return null;
  }

  async inviteUser(
    user: number,
    channelID: number,
    userToInvite: number,
  ): Promise<IChannelUsers> {
    let retUserChan: ChannelPlayer = null;
    const channelPlayerUser: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: user,
          },
          channel: {
            id: channelID,
          },
        },
      });
    const channelInvitedPlayer: ChannelPlayer =
      await this.channelPlayerTable.findOne({
        relations: {
          player: true,
          channel: true,
        },
        where: {
          player: {
            id: userToInvite,
          },
          channel: {
            id: channelID,
          },
        },
      });
    const channel: Channel = await this.findChannelById(channelID);
    if (
      !channelPlayerUser ||
      (await this.isDirectChannel(channelID)) ||
      !channel
    )
      return null;
    if (
      channelPlayerUser &&
      !channelPlayerUser.time_banned_until &&
      !channelPlayerUser.time_kicked_until
    ) {
      if (!channelInvitedPlayer)
        retUserChan = await this.createChannelPlayer(channel, userToInvite);
      else if (
        !channelInvitedPlayer.time_banned_until &&
        channelInvitedPlayer.time_kicked_until
      ) {
        channelInvitedPlayer.time_kicked_until = null;
        retUserChan = await this.channelPlayerTable.save(channelInvitedPlayer);
      }
    }
    if (!retUserChan) return null;
    const player = await this.playerTable.findOne({
      where: { id: retUserChan.id_player },
      select: { id: true, username: true, login: true },
    });
    return {
      id: retUserChan.id_player,
      login: player.login,
      username: player.username,
      is_owner: retUserChan.id_player == channel.id_owner,
      admin: retUserChan.admin,
    };
  }

  async createIndirectChannel(name: string, user: number): Promise<IChannel> {
    let channel = new Channel();
    const time = new Date();

    if (await this.findChannelByName(name)) return;

    channel.owner = await this.playerService.findById(user);
    channel.name = name;
    channel.password = null;
    channel.private = false;
    channel.is_direct = false;
    channel.time_created = time;
    channel = await this.channelTable.save(channel);
    await this.createChannelPlayer(channel, user);
    const ret_channel: IChannel = {
      id: channel.id,
      id_owner: user,
      name: channel.name,
      is_direct: false,
      private: channel.private,
    };
    return ret_channel;
  }

  async createDirectChannel(user1: number, user2: number): Promise<IChannel> {
    const time = new Date();
    let channel: Channel = await this.channelTable
      .createQueryBuilder('channel')
      .innerJoin(
        'channel.channelPlayers',
        'player1',
        'player1.id_player = :user1',
        { user1 },
      )
      .innerJoin(
        'channel.channelPlayers',
        'player2',
        'player2.id_player = :user2',
        { user2 },
      )
      .where('channel.is_direct = :is_direct', { is_direct: true })
      .getOne();

    if (channel) return channel;
    channel = new Channel();
    channel.owner = await this.playerService.findById(user1);
    channel.name = null;
    channel.password = null;
    channel.private = true;
    channel.is_direct = true;
    channel.time_created = time;
    channel = await this.channelTable.save(channel);
    await this.createChannelPlayer(channel, user1);
    await this.createChannelPlayer(channel, user2);
    const ret_channel: IChannel = {
      id: channel.id,
      id_owner: user1,
      name: null,
      is_direct: true,
      private: false,
    };
    return ret_channel;
  }

  async createChannelPlayer(
    channel: Channel,
    user: number,
  ): Promise<ChannelPlayer> {
    let channelPlayer: ChannelPlayer = new ChannelPlayer();
    let player: Player = await this.playerService.findById(user);

    channelPlayer.channel = channel;
    channelPlayer.player = player;
    if (channel.id_owner === user) channelPlayer.admin = true;
    let tesst = await this.channelPlayerTable.save(channelPlayer);
    return tesst;
  }

  async createChannelMessage(sendMessage: sendMessageDTO, user: number) {
    const time = new Date();
    const channelMessage: ChannelMessage = new ChannelMessage();
    const player: Player = await this.playerService.findById(user);
    const channelPlayer: ChannelPlayer = await this.channelPlayerTable.findOne({
      relations: {
        player: true,
        channel: true,
      },
      where: {
        player: {
          id: user,
        },
        channel: {
          id: sendMessage.id_channel,
        },
      },
    });
    if (!player || !channelPlayer) return undefined;
    if (
      channelPlayer.time_banned_until ||
      channelPlayer.time_kicked_until ||
      (channelPlayer.time_muted_until &&
        new Date().getTime() - channelPlayer.time_muted_until.getTime() < 30000)
    )
      return undefined;
    channelMessage.channelPlayer = channelPlayer;
    channelMessage.time_posted = time;
    channelMessage.type = MessageType.TEXT;
    channelMessage.content = sendMessage.content;
    this.channelMessageTable.save(channelMessage);
    return channelMessage;
  }

  async changePrivate(user: number, channelID: number) {
    const channel: Channel = await this.channelTable.findOne({
      select: {
        id: true,
        id_owner: true,
        private: true,
        is_direct: true,
      },
      where: {
        id: channelID,
      },
    });

    if (channel && !channel.is_direct && channel.id_owner == user) {
      channel.private = !channel.private;
      this.channelTable.save(channel);
    }
  }

  async getMessagesFromChannel(
    user: number,
    getChannelMessages: sendChannelIdDTO,
  ): Promise<IChannelMessage[]> {
    const player = await this.playerTable.findOne({
      where: { id: user },
      relations: { blockedPlayers: true },
    });
    const id_blocked = await player.blockedPlayers.map(
      (blocked) => blocked.id_blocked,
    );
    const channelMessages: IChannelMessage[] =
      await this.channelMessageTable.find({
        select: {
          id: true,
          id_channel: true,
          id_player: true,
          content: true,
          time_posted: true,
        },
        where: {
          channelPlayer: {
            id_channel: getChannelMessages.channelID,
            id_player: Not(In([...id_blocked])),
          },
        },
      });
    for (let message of channelMessages) {
      const player: Player = await this.playerTable.findOne({
        select: { username: true, avatar_path: true },
        where: { id: message.id_player },
      });
      if (player) {
        message.name = player.username;
        message.avatar_path = player.avatar_path;
      } else message.name = 'anonymous';
    }
    return channelMessages;
  }
}
