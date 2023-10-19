import {
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class sendMessageDTO {

  @IsNumber()
  id_channel: number;

  @IsString()
  @IsOptional()
  content: string;

}
