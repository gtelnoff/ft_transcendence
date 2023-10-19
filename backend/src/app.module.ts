import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlayerController } from './player/player.controller';
import { PlayerModule } from './player/player.module';
import { PlayerService } from './player/player.service';
import { Player } from './player/entities/player.entity';
import { Match } from './match/entities/match.entity';
import { Blocked } from './blocked-player/entities/blockedPlayer.entity';
import { Friends } from './friends/entities/friends.entity';
import { Channel } from './channel/entities/channel.entity';
import { ChannelMessage } from './channel/entities/channelMessage.entity';
import { ChannelPlayer } from './channel/entities/channelPlayer.entity';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/auth.guard';
import { ChannelController } from './channel/channel.controller';
import { ChannelModule } from './channel/channel.module';
import { ChannelService } from './channel/channel.service';
import { MatchService } from './match/match.service';
import { MatchModule } from './match/match.module';
import { GameModule } from './game/game.module';
import { FriendsModule } from './friends/friends.module';
import { FriendsController } from './friends/friends.controller';
import { FriendsService } from './friends/friends.service';
import { BlockedPlayerModule } from './blocked-player/blocked-player.module';
import { BlockedPlayerService } from './blocked-player/blocked-player.service';
import { BlockedPlayerController } from './blocked-player/blocked-player.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { PlayerNotif } from './notifications/entities/notifications.entity';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { GameService } from './game/game.service';
import { NotificationSocketService } from './socket/notification/notification.service';
import { ChatService } from './socket/chat/chat.service';
import { NotificationSocketModule } from './socket/notification/notification.module';
import { ChatModule } from './socket/chat/chat.module';

@Module({
  imports: [
    PlayerModule,
    ChannelModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET, //process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '36000s' }, //process.env.JWT_EXPIRE_TIME },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [
        Player,
        Match,
        Blocked,
        Friends,
        Channel,
        ChannelMessage,
        ChannelPlayer,
        PlayerNotif,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Player,
      Match,
      Blocked,
      Friends,
      Channel,
      ChannelMessage,
      ChannelPlayer,
      PlayerNotif,
    ]),
    AuthModule,
    HttpModule,
    PassportModule,
    MatchModule,
    GameModule,
    FriendsModule,
    BlockedPlayerModule,
    NotificationSocketModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [
    AppController,
    PlayerController,
    AuthController,
    ChannelController,
    FriendsController,
    BlockedPlayerController,
    NotificationsController,
  ],
  providers: [
    AppService,
    PlayerService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    ChannelService,
    MatchService,
    FriendsService,
    BlockedPlayerService,
    NotificationsService,
    NotificationSocketService,
    ChatService,
    GameService,
  ],
})
export class AppModule {}
