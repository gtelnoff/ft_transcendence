import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsDate,
} from 'class-validator';

export class CreatePlayerDTO {
  @IsString()
  login: string;

  @IsString()
  username: string;

  @IsString()
  @IsOptional()
  avatar_path?: string;

  @IsString()
  @IsOptional()
  jwt_token?: string;

  @IsDate()
  @IsOptional()
  last_connection?: Date;

  @IsBoolean()
  @IsOptional()
  online?: boolean;

  @IsNumber()
  @IsOptional()
  classic_elo?: number;

  @IsNumber()
  @IsOptional()
  classic_wins?: number;

  @IsNumber()
  @IsOptional()
  classic_losses?: number;

  @IsOptional()
  @IsNumber()
  custom_elo?: number;

  @IsNumber()
  @IsOptional()
  custom_wins?: number;

  @IsNumber()
  @IsOptional()
  custom_losses?: number;

  @IsOptional()
  @IsNumber()
  id_active_trophy?: number;
}
