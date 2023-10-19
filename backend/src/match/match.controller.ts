import {
  Get,
  Param,
  ParseIntPipe,
  UsePipes,
  Controller,
  ValidationPipe,
} from '@nestjs/common';
import { Match } from './entities/match.entity';
import { MatchService } from './match.service';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get(':id')
  @UsePipes(new ValidationPipe())
  async findById(@Param('id', new ParseIntPipe()) id: number): Promise<Match> {
    const result: Match = await this.matchService.findById(id as number);
    return result;
  }

  @Get('/byPlayerId/:idPlayer')
  async lastMatchesByPlayerId(
    @Param('idPlayer', new ParseIntPipe()) idPlayer: number,
  ): Promise<Match[]> {
    return await this.matchService.findLastMatchesByPlayerId(idPlayer);
  }
}
