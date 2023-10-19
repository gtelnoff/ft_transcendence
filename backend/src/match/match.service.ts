import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { CreateMatchDTO } from './dto/createMatch.dto';
import { plainToClass } from 'class-transformer';
import { UpdateMatchDTO } from './dto/updateMatch.dto';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private MatchTable: Repository<Match>,
  ) {}

  async findById(id_match: number): Promise<Match> {
    return await this.MatchTable.findOneOrFail({ where: { id: id_match } });
  }

  async findLastMatchesByPlayerId(id_player: number): Promise<Match[]> {
    return await this.MatchTable.find({
      where: [
        { id_player1: id_player, time_ended: Not(IsNull()) },
        { id_player2: id_player, time_ended: Not(IsNull()) },
      ],
      order: { time_started: 'DESC' },
      take: 20,
    });
  }

  async createMatch(createMatch: CreateMatchDTO): Promise<Match> {
    const match = plainToClass(Match, createMatch);
    return this.MatchTable.save(match);
  }

  async updateMatch(updateMatch: UpdateMatchDTO): Promise<Match> {
    await this.MatchTable.update(
      { id: updateMatch.id },
      {
        score_p1: updateMatch.score_p1,
        score_p2: updateMatch.score_p2,
        elochange_p1: updateMatch.elochange_p1,
        elochange_p2: updateMatch.elochange_p2,
        time_ended: new Date(),
        result: updateMatch.result,
      },
    );

    return this.MatchTable.findOneOrFail({ where: { id: updateMatch.id } });
  }

  async destroyMatch(idMatch: number) {
    await this.MatchTable.delete({ id: idMatch });
  }
}
