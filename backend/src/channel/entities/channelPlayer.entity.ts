import { Player } from 'src/player/entities/player.entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Channel } from './channel.entity';
import { ChannelMessage } from './channelMessage.entity';

@Entity()
export class ChannelPlayer {
  @PrimaryColumn()
  id_channel: number;

  @PrimaryColumn()
  id_player: number;

  @Column({ default: false })
  admin: boolean;

  @Column({ type: 'timestamptz', default: null })
  time_muted_until: Date;

  @Column({ type: 'timestamptz', default: null })
  time_kicked_until: Date;

  @Column({ type: 'timestamptz', default: null })
  time_banned_until: Date;

  /* Relations */

  @ManyToOne(() => Channel, (channel) => channel.channelPlayers)
  @JoinColumn({ name: 'id_channel', referencedColumnName: 'id' })
  channel: Channel;

  @ManyToOne(() => Player, (player) => player.channelPlayers)
  @JoinColumn({ name: 'id_player', referencedColumnName: 'id' })
  player: Player;

  @OneToMany(
    () => ChannelMessage,
    (channelMessage) => channelMessage.channelPlayer,
  )
  channelMessages: ChannelMessage[];
}
