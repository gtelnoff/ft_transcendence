import { IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { MatchResult } from '../entities/match.entity';

export class UpdateMatchDTO {
  @IsNumber()
  id: number;

  @IsNumber()
  score_p1: number;

  @IsNumber()
  score_p2: number;

  @IsEnum(MatchResult)
  result: MatchResult;

  @IsNumber()
  elochange_p1: number;

  @IsNumber()
  elochange_p2: number;
}
