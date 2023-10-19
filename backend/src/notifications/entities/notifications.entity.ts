import { GameType } from 'src/game/game.config';
import { Player } from 'src/player/entities/player.entity';
import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

export enum NotifType {
  MSG = 'MSG',
  CHALLENGE = 'CHALLENGE',
  FRIEND = 'FRIEND',
}

@Entity()
export class PlayerNotif extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_player: number;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'id_player', referencedColumnName: 'id' })
  player: Player;

  @Column({ type: 'timestamptz', default: 'NOW()' })
  time_sent: Date;

  @Column({
    type: 'enum',
    enum: NotifType,
  })
  type: NotifType;

  @Column({ nullable: true })
  id_challenger: number;

  @Column({
    type: 'enum',
    enum: GameType,
    nullable: true,
  })
  gameType: GameType;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'id_challenger', referencedColumnName: 'id' })
  challenger: Player;

  @Column({ nullable: true })
  id_friend: number;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'id_friend', referencedColumnName: 'id' })
  friend: Player;

  @Column({ nullable: true })
  id_channel: number;

  @Column({ nullable: true, default: 1 })
  nb_new_messages: number;
}
