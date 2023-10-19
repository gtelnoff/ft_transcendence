import { Player } from 'src/player/entities/player.entity';
import { IsNumber, IsBoolean, IsDate, ValidateNested } from 'class-validator';

export class FriendsDTO {
  @IsNumber()
  id_player: number;

  @IsNumber()
  id_invited: number;

  @ValidateNested()
  player: Player;

  @ValidateNested()
  invited: Player;

  @IsBoolean()
  accepted: boolean;

  @IsDate()
  time_accepted: Date;
}
