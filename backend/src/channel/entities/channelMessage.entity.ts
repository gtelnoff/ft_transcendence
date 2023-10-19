import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { ChannelPlayer } from './channelPlayer.entity';

export enum MessageType {
  TEXT = 'TEXT',
  JOIN = 'JOIN',
  LEFT = 'LEFT',
  KICK = 'KICK',
  BAN = 'BAN',
  MUTE = 'MUTE',
  INVITE = 'INVITE',
}

@Entity()
export class ChannelMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_channel: number;

  @Column()
  id_player: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  time_posted: Date;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column({ nullable: true })
  content: string;

  /* Relations */

  @ManyToOne(() => ChannelPlayer)
  @JoinColumn([
    { name: 'id_channel', referencedColumnName: 'id_channel' },
    { name: 'id_target', referencedColumnName: 'id_player' },
  ])
  targetChannelPlayer: ChannelPlayer;

  @ManyToOne(
    () => ChannelPlayer,
    (channelPlayer) => channelPlayer.channelMessages,
  )
  @JoinColumn([
    { name: 'id_player', referencedColumnName: 'id_player' },
    { name: 'id_channel', referencedColumnName: 'id_channel' },
  ])
  channelPlayer: ChannelPlayer;
}
