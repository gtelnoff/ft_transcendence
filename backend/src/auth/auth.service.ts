import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { lastValueFrom } from 'rxjs';
import { CreatePlayerDTO } from 'src/player/dto/createPlayer.dto';
import { PlayerService } from 'src/player/player.service';
import { authenticator } from '@otplib/preset-default';
import qrcode = require('qrcode');
import crypto = require('crypto');

@Injectable()
export class AuthService {
  api42_url = 'https://api.intra.42.fr';
  algorithm = 'aes256';
  key = process.env.TWOFA_ENCRYPTION_KEY;
  iv = process.env.TWOFA_ENCRYPTION_IV;

  constructor(
    private readonly http: HttpService,
    private readonly jwtService: JwtService,
    private readonly playerService: PlayerService,
  ) {}

  // Recovers the token for 42 APIs.
  async get42ApiToken(code: string, returnUri: string): Promise<any> {
    let formData = new FormData();

    const url = this.api42_url + '/oauth/token';
    formData = this.setFormData(formData, code, returnUri);

    try {
      const fortyTwoToken = await lastValueFrom(this.http.post(url, formData));
      return fortyTwoToken;
    } catch (err) {
      return;
    }
  }

  setFormData(formData: any, code: string, returnUri: string) {
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', process.env.API42_TOKEN);
    formData.append('client_secret', process.env.API42_SECRET);
    formData.append('redirect_uri', returnUri);
    formData.append('code', code);

    return formData;
  }

  // Add user to database.
  async addPlayerToDataBase(login: string) {
    let player: any;
    let createPlayer: CreatePlayerDTO;

    player = await this.playerService.findByLogin(login);
    if (!player) {
      createPlayer = {
        login: login,
        username: login,
        avatar_path: 'gremlins.jpg',
        classic_elo: 1000,
        custom_elo: 1000,
      };
      player = await this.playerService.create(createPlayer);
    }
    return player.is_first_connection;
  }

  // Returns the Jwt for authentication.
  async getJwt(login: string): Promise<any> {
    const player = await this.playerService.findByLogin(login);
    const payload = { idPlayer: player.id };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  // Recover user info with a call to 42API.
  async getUserInfo(token: string): Promise<any> {
    const url = this.api42_url + '/v2/me';
    const headers = { Authorization: 'Bearer ' + token };
    return await lastValueFrom(this.http.get(url, { headers }));
  }

  // See if the user must log in with the 2FA.
  async haveTwoFA(login: string) {
    const playerInfos = await this.playerService.findByLogin(login);
    return playerInfos.two_factor_auth;
  }

  // Return the Qrcode to add the 2FA (the function is ugly I know).
  async getQRCode(id: number) {
    const userInfos = await this.playerService.findById(id);
    const userLogin = userInfos.login;
    const service = 'Pong';
    const secret = authenticator.generateSecret();
    //Encryption
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    const encryptedSecret =
      cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');

    await this.playerService.setTwoFASecretKey(id, encryptedSecret);

    const QRCOdeInfos = authenticator.keyuri(
      encodeURIComponent(userLogin),
      encodeURIComponent(service),
      secret,
    );

    return new Promise((resolve, reject) => {
      qrcode.toDataURL(QRCOdeInfos, (err, imageUrl) => {
        if (err) {
          reject(err);
        } else {
          resolve(imageUrl);
        }
      });
    });
  }

  // Check whether the code entered by the user for the 2FA is correct or not.
  async checkCode(login: string, code: string) {
    const encryptedSecretKey = await this.playerService.getTwoFASecretKey(
      login,
    );
    //Decryption
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    const decryptedSecret =
      decipher.update(encryptedSecretKey, 'hex', 'utf8') +
      decipher.final('utf8');

    const rightCode = authenticator.generate(decryptedSecret);
    if (code == rightCode) return true;
    return false;
  }

  async getTestUserJwt(): Promise<any> {
    let player = await this.playerService.findByLogin('TestUser');
    if (!player) {
      player = await this.playerService.create({
        login: 'TestUser',
        username: 'TestUsername',
        avatar_path: 'gremlins.jpg',
      });
    }
    return {
      access_token: await this.jwtService.signAsync({ idPlayer: player.id }),
    };
  }
}
