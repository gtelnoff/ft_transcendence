import { Player } from 'src/player/entities/player.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum MatchResult {
  P1_WIN = 'P1_WIN',
  P2_WIN = 'P2_WIN',
  DRAW = 'DRAW',
}

@Entity()
export class Match extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  time_started: Date;

  @Column({ type: 'timestamptz', nullable: true })
  time_ended: Date;

  @Column({ default: 0 })
  score_p1: number;

  @Column({ default: 0 })
  score_p2: number;

  @Column({ default: 0 })
  elochange_p1: number;

  @Column({ default: 0 })
  elochange_p2: number;

  @Column({ default: true })
  classic_game: boolean;

  @Column({ nullable: true, type: 'enum', enum: MatchResult })
  result: MatchResult;

  /* Relations */
  @Column()
  id_player1: number;

  @Column()
  id_player2: number;

  @ManyToOne(() => Player, (player) => player.matchesAsPlayer1)
  @JoinColumn({ name: 'id_player1', referencedColumnName: 'id' })
  player1: Player;

  @ManyToOne(() => Player, (player) => player.matchesAsPlayer2)
  @JoinColumn({ name: 'id_player2', referencedColumnName: 'id' })
  player2: Player;
}
