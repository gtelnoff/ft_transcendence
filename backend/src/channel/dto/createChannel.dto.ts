import {
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class createIndirectChannelDTO {
  @IsString()
  @IsOptional()
  password: string;

  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  private: boolean;
}

export class createDirectChannelDTO {
  @IsNumber()
  user: number;
}
