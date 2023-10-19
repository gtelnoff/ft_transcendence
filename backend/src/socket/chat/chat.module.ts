import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChannelModule } from 'src/channel/channel.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from 'src/player/entities/player.entity';
import { PlayerModule } from 'src/player/player.module';
import { NotificationSocketModule } from '../notification/notification.module';
import { BlockedPlayerModule } from 'src/blocked-player/blocked-player.module';

@Module({
  imports: [
    ChannelModule,
    BlockedPlayerModule,
    PlayerModule,
    TypeOrmModule.forFeature([Player]),
    ChatModule,
    NotificationSocketModule,
  ],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
