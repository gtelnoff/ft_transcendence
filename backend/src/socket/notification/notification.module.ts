import { Module, forwardRef } from '@nestjs/common';
import { NotificationSocketService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { PlayerModule } from 'src/player/player.module';
import { GameModule } from 'src/game/game.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameModule), NotificationsModule],
  providers: [NotificationSocketService, NotificationGateway],
  exports: [NotificationSocketService],
})
export class NotificationSocketModule {}
