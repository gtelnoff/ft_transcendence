import { Body, Controller, Post, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthenticateDTO,
  changeUsernameDTO,
  checkTwoFACodeDTO,
} from './dto/authenticate.dto';
import { Public } from './passport/public.decorator';
import { PlayerService } from 'src/player/player.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private playerService: PlayerService,
  ) {}

  @Post('try-login')
  @Public()
  async login(@Body() authDto: AuthenticateDTO) {
    let response: any;

    // Retrieves a token to make calls to 42 APIs.
    response = await this.authService.get42ApiToken(
      authDto.apiCode,
      authDto.returnUri,
    );
    if (!response) return { access: 'badCode' };
    const fortyTwoToken = response.data.access_token;
    // Retrieves player infos.
    response = await this.authService.getUserInfo(fortyTwoToken);

    // Add the user in the DB if he is not in it.
    const isFirstConnection = await this.authService.addPlayerToDataBase(
      response.data.login,
    );
    if (isFirstConnection === true)
      return {
        fortyTwoToken: fortyTwoToken,
        isFirstConnection: true,
        login: response.data.login,
        first_name: response.data.first_name,
      };

    // If the user have a 2FA haveTwoFA === true, else haveTwoFA === false.
    const haveTwoFA = await this.authService.haveTwoFA(response.data.login);

    if (haveTwoFA == true)
      return {
        fortyTwoToken: fortyTwoToken,
        first_name: response.data.first_name,
        twoFA: true,
      };

    // Create the Jwt.
    response = await this.authService.getJwt(response.data.login);

    return { access: true, jwt: response.access_token, twoFA: false };
  }

  @Post('check-twofa-code')
  @Public()
  async checkTwoFACode(@Body() twoFACodeDTO: checkTwoFACodeDTO) {
    let response: any;

    const fortyTwoToken = twoFACodeDTO.fortyTwoToken;

    const userInfo = await this.authService.getUserInfo(fortyTwoToken);

    if (userInfo.data.login === undefined) return { access: false };

    response = await this.authService.checkCode(
      userInfo.data.login,
      twoFACodeDTO.code,
    );

    if (response === false) return { access: false };

    response = await this.authService.getJwt(userInfo.data.login);
    return { access: true, jwt: response.access_token };
  }

  // Returns the Url of the qrcode code.
  @Get('get-qrcode')
  async getQRCode(@Request() req) {
    const QRCodeUrl = await this.authService.getQRCode(req.user.idPlayer);
    return { QRCode: QRCodeUrl };
  }

  @Post('remove-twofa')
  async removeTwoFA(@Request() req, @Body() twoFACodeDTO: checkTwoFACodeDTO) {
    const userInfos = await this.playerService.findById(req.user.idPlayer);

    const response = await this.authService.checkCode(
      userInfos.login,
      twoFACodeDTO.code,
    );
    if (response === false) return { success: false };

    await this.playerService.removeTwoFA(req.user.idPlayer);
    return { success: true };
  }

  @Post('add-twofa')
  async addTwoFA(@Request() req, @Body() twoFACodeDTO: checkTwoFACodeDTO) {
    const userInfos = await this.playerService.findById(req.user.idPlayer);

    const response = await this.authService.checkCode(
      userInfos.login,
      twoFACodeDTO.code,
    );
    if (response === false) return { success: false };

    await this.playerService.addTwoFa(req.user.idPlayer);
    return { success: true };
  }

  @Post('change-username')
  @Public()
  async changeUsername(@Body() changeUsernameDTO: changeUsernameDTO) {
    let response: any;

    const userInfos = await this.authService.getUserInfo(
      changeUsernameDTO.fortyTwoToken,
    );
    if (
      userInfos.data.login === undefined ||
      userInfos.data.isFirstConnection === false
    )
      return { access: 'denied' };

    response = await this.playerService.changeUsernameByLogin(
      userInfos.data.login,
      changeUsernameDTO.username,
    );
    if (response !== 0) return { error: response };

    response = await this.authService.getJwt(userInfos.data.login);
    return { access: true, jwt: response.access_token };
  }

  // @Public()
  // @Get('TestUser')
  // async getTestUser() {
  //   return await this.authService.getTestUserJwt();
  // }

  @Get('logged')
  isLogged() {
    // Will return 401 unauthorized thanks to the global guard anyway if the jwtToken isn't valid
    // This is a call that is gonna be implemented in the global route guard in the frontend, so we still need this call and we need it
    // to be as light as possible, since it's gonna be called for every route.
    return;
  }
}
