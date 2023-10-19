import { IsString } from 'class-validator';

export class AuthenticateDTO {
  @IsString()
  apiCode: string;
  returnUri: string;
}

export class PlayerNameDTO {
  @IsString()
  playerName: string;
}

export class PlayerInfos {
  @IsString()
  playerName: string;

  @IsString()
  playerImage: string;
}

export class checkTwoFACodeDTO {
  @IsString()
  fortyTwoToken: string;

  @IsString()
  code: string;
}

export class fortyTwoTokenDTO {
  @IsString()
  value: string;
}

export class changeUsernameDTO {
  @IsString()
  fortyTwoToken: string;

  @IsString()
  username: string;
}
