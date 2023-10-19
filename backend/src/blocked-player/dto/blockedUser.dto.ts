import { Player } from 'src/player/entities/player.entity';
import { IsNumber, IsDate, ValidateNested } from 'class-validator';

export class BlockedUserDTO {
  @IsNumber()
  id_user: number;

  @IsNumber()
  id_blocked: number;

  @ValidateNested()
  user: Player;

  @ValidateNested()
  blocked: Player;

  @IsDate()
  time_accepted: Date;
}
