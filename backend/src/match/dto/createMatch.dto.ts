import { IsNumber, IsBoolean } from 'class-validator';

export class CreateMatchDTO {
  @IsNumber()
  id_player1: number;

  @IsNumber()
  id_player2: number;

  @IsBoolean()
  ladder_game: boolean;

  @IsBoolean()
  classic_game: boolean;
}
