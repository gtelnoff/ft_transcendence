import { Module, forwardRef } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { MatchModule } from 'src/match/match.module';
import { PlayerModule } from 'src/player/player.module';
import { GameService } from './game.service';
import { NotificationSocketModule } from 'src/socket/notification/notification.module';

@Module({
  imports: [
    MatchModule,
    PlayerModule,
    forwardRef(() => NotificationSocketModule),
  ],
  providers: [GameGateway, GameService],
  exports: [GameService],
})
export class GameModule {}
