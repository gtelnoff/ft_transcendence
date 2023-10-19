import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PlayerNotif } from './entities/notifications.entity';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedPlayerModule } from 'src/blocked-player/blocked-player.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerNotif]),
    PassportModule,
    BlockedPlayerModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
