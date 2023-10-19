import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlayerDTO } from './dto/createPlayer.dto';
import { Player } from './entities/player.entity';
import { plainToClass } from 'class-transformer';
import { GameType } from 'src/game/game.config';
import { IPlayerPublicInfo } from './dto_out/IPlayerPublicInfo.dto';
import { IPlayerModeInfo } from './dto_out/IPlayerModeInfo.dto';

export const usernameAlreadyExist = 'Error: This username already exist.';
export const usernamebadSize =
  'Error: The length of your username to be between 3 - 12 characters.';
export const spaceInUsername = 'Error: Only A-Z, a-z, 0-9 in username.';
@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private playerTable: Repository<Player>,
  ) {}

  async findById(id: number): Promise<Player> {
    return await this.playerTable.findOne({ where: { id: id } });
  }

  async findByLogin(login: string): Promise<Player> {
    return await this.playerTable.findOne({ where: { login: login } });
  }

  async findByUsername(username: string): Promise<Player> {
    return await this.playerTable.findOne({ where: { username: username } });
  }

  create(createPlayer: CreatePlayerDTO): Promise<Player> {
    const player = plainToClass(Player, createPlayer);
    return this.playerTable.save(player);
  }

  async update(player: Player) {
    await this.playerTable.save(player);
  }

  async addTwoFa(id: number) {
    const player = await this.playerTable.findOne({ where: { id: id } });
    player.two_factor_auth = true;
    return this.playerTable.save(player);
  }

  async removeTwoFA(id: number) {
    const player = await this.playerTable.findOne({ where: { id: id } });
    player.two_factor_auth = false;
    return this.playerTable.save(player);
  }

  async getTwoFASecretKey(login: string) {
    const player = await this.playerTable.findOne({ where: { login: login } });
    return player.two_fa_secret;
  }

  async setTwoFASecretKey(id: number, secretKey: string) {
    const player = await this.playerTable.findOne({ where: { id: id } });
    player.two_fa_secret = secretKey;
    return this.playerTable.save(player);
  }

  async findByAuthToken(token: string): Promise<Player> {
    return await this.playerTable.findOne({ where: { jwt_token: token } });
  }

  async changeUsername(username: string, id: number) {
    const response = await this.checkUsername(username);
    if (response) return response;

    const player = await this.playerTable.findOne({ where: { id: id } });
    player.username = username;
    this.playerTable.save(player);

    return 0;
  }

  async changeUsernameByLogin(login: string, username: string) {
    const response = await this.checkUsername(username);
    if (response) return response;
    const player = await this.playerTable.findOne({ where: { login: login } });
    player.username = username;
    player.is_first_connection = false;
    await this.playerTable.save(player);

    return 0;
  }

  async checkUsername(username: string) {
    const whiteSpace = /[^a-zA-Z0-9]/;
    const player = await this.playerTable.findOne({
      where: { username: username },
    });

    if (player) return usernameAlreadyExist;
    if (username.length < 3 || username.length > 12) return usernamebadSize;
    if (whiteSpace.test(username)) return spaceInUsername;
    return 0;
  }

  async setAvatar(id: number, filePath: string) {
    const player = await this.playerTable.findOne({ where: { id: id } });
    player.avatar_path = filePath;
    return this.playerTable.save(player);
  }

  async getAvatar(id: number) {
    const player = await this.findById(id);
    const url: string = player.avatar_path;
    return url;
  }

  getPlayerModeInfo(type: GameType, player: Player): IPlayerModeInfo {
    if (type == GameType.CLASSIC) {
      return {
        username: player.username,
        avatar_path: player.avatar_path,
        elo: player.classic_elo,
        wins: player.classic_wins,
        losses: player.classic_losses,
      };
    } else {
      return {
        username: player.username,
        avatar_path: player.avatar_path,
        elo: player.custom_elo,
        wins: player.custom_wins,
        losses: player.custom_losses,
      };
    }
  }

  getPlayerPublicInfo(player: Player, idUser: number): IPlayerPublicInfo {
    return {
      id: player.id,
      login: player.login,
      username: player.username,
      avatar_path: player.avatar_path,
      classic_elo: player.classic_elo,
      classic_wins: player.classic_wins,
      classic_losses: player.classic_losses,
      custom_elo: player.custom_elo,
      custom_wins: player.custom_wins,
      custom_losses: player.custom_losses,
      is_the_user: idUser == player.id,
    };
  }

  async getIdByName(username: string): Promise<any> {
    let id = await this.playerTable.findOne({
      select: { id: true },
      where: { username: username },
    });
    if (id) return { id: id };
    return { id: null };
  }

  async getPlayerIdByUsername(username: string) {
    const player = await this.playerTable.findOne({
      where: { username: username },
    });
    if (!player) return -1;
    return player.id;
  }
}
