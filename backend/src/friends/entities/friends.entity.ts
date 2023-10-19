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
export class Friends extends BaseEntity {
  @PrimaryColumn()
  id_player: number;

  @PrimaryColumn()
  id_invited: number;

  @ManyToOne(() => Player, (player) => player.invitesSent)
  @JoinColumn({ name: 'id_player', referencedColumnName: 'id' })
  player: Player;

  @ManyToOne(() => Player, (player) => player.invitesReceived)
  @JoinColumn({ name: 'id_invited', referencedColumnName: 'id' })
  invited: Player;

  @Column({ type: 'timestamptz', nullable: true })
  time_accepted: Date;
}
