import { Player } from 'src/player/entities/player.entity';
import {
  Entity,
  Column,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { ChannelPlayer } from './channelPlayer.entity';

@Entity()
export class Channel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_owner: number;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'id_owner', referencedColumnName: 'id' })
  owner: Player;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  private: boolean;

  @Column({ default: false })
  is_direct: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  time_created: Date;

  @OneToMany(() => ChannelPlayer, (channelPlayer) => channelPlayer.channel)
  channelPlayers: ChannelPlayer[];
}
