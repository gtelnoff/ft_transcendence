import { IsString } from 'class-validator';

export class newUsernameDTO {
  @IsString()
  newUsername: string;
}
