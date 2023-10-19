import { IsNumber } from 'class-validator';

export class sendChannelIdDTO {
  @IsNumber()
  channelID: number;
}

export class actionOnUserDTO {
  @IsNumber()
  channelID: number;

  @IsNumber()
  user: number;
}
