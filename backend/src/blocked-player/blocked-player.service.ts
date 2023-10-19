import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blocked } from './entities/blockedPlayer.entity';

@Injectable()
export class BlockedPlayerService {
  constructor(
    @InjectRepository(Blocked)
    private blockedTable: Repository<Blocked>,
  ) {}

  async findAllPlayersBlockedBy(id_player: number): Promise<number[]> {
    const blockedList = await this.blockedTable.find({ where: { id_player } });
    return blockedList.map((blocked) => blocked.id_blocked);
  }

  async findBlockedPlayer(
    id_player: number,
    id_blocked: number,
  ): Promise<Blocked> {
    return await this.blockedTable.findOne({
      where: { id_player, id_blocked },
    });
  }

  async createBlockedPlayer(
    id_player: number,
    id_blocked: number,
  ): Promise<Blocked> {
    const blocked: Blocked = this.blockedTable.create({
      id_player,
      id_blocked,
    });
    if (!blocked) {
      return;
    }
    return await this.blockedTable.save(blocked);
  }

  async deleteBlockedPlayer(id_player: number, id_blocked: number) {
    await this.blockedTable.delete({ id_player, id_blocked });
  }
}
