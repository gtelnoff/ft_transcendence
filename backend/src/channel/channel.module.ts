import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelPlayer } from './entities/channelPlayer.entity';
import { ChannelMessage } from './entities/channelMessage.entity';
import { PlayerModule } from 'src/player/player.module';
import { Channel } from './entities/channel.entity';
import { Player } from 'src/player/entities/player.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelPlayer, ChannelMessage, Player]),
    PlayerModule,
  ],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
