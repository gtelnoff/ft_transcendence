import { Blocked } from 'src/blocked-player/entities/blockedPlayer.entity';
import { ChannelPlayer } from 'src/channel/entities/channelPlayer.entity';
import { Friends } from 'src/friends/entities/friends.entity';
import { Match } from 'src/match/entities/match.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  OneToMany,
} from 'typeorm';

@Entity()
export class Player extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  login: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  avatar_path: string;

  @Column({ nullable: true })
  jwt_token: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  last_connection: Date;

  @Column({ default: false })
  two_factor_auth: boolean;

  @Column({ default: true })
  is_first_connection: boolean;

  @Column({ default: 0, nullable: true })
  classic_elo: number;

  @Column({ default: 0 })
  classic_wins: number;

  @Column({ default: 0 })
  classic_losses: number;

  @Column({ default: 0, nullable: true })
  custom_elo: number;

  @Column({ default: 0 })
  custom_wins: number;

  @Column({ nullable: true })
  two_fa_secret: string;

  @Column({ default: 0 })
  custom_losses: number;

  /* Relationships */

  @OneToMany(() => Blocked, (blockedPlayer) => blockedPlayer.player)
  blockedPlayers: Blocked[];

  @OneToMany(() => Friends, (friends) => friends.player)
  invitesSent: Friends[];

  @OneToMany(() => Friends, (friends) => friends.invited)
  invitesReceived: Friends[];

  @OneToMany(() => ChannelPlayer, (channelPlayer) => channelPlayer.player)
  channelPlayers: ChannelPlayer[];

  @OneToMany(() => Match, (match) => match.player1)
  matchesAsPlayer1: Match[];

  @OneToMany(() => Match, (match) => match.player2)
  matchesAsPlayer2: Match[];

  get matches(): Match[] {
    return [...this.matchesAsPlayer1, ...this.matchesAsPlayer2];
  }
}
