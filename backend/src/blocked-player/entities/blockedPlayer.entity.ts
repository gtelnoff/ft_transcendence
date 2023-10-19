import { Player } from 'src/player/entities/player.entity';
import {
  Entity,
  Column,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class Blocked extends BaseEntity {
  @PrimaryColumn()
  id_player: number;

  @PrimaryColumn()
  id_blocked: number;

  @ManyToOne(() => Player, (player) => player.invitesSent)
  @JoinColumn({ name: 'id_player', referencedColumnName: 'id' })
  player: Player;

  @ManyToOne(() => Player, (player) => player.invitesReceived)
  @JoinColumn({ name: 'id_blocked', referencedColumnName: 'id' })
  blocked: Player;

  @Column({ type: 'timestamptz', default: 'NOW()' })
  time_blocked: Date;
}
