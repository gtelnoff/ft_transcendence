import { Module } from '@nestjs/common';
import { BlockedPlayerController } from './blocked-player.controller';
import { BlockedPlayerService } from './blocked-player.service';
import { Blocked } from './entities/blockedPlayer.entity';
import { JwtStrategy } from 'src/auth/passport/auth.strategy';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsModule } from 'src/friends/friends.module';

@Module({
  imports: [TypeOrmModule.forFeature([Blocked]), PassportModule, FriendsModule],
  controllers: [BlockedPlayerController],
  providers: [BlockedPlayerService, JwtStrategy],
  exports: [BlockedPlayerService],
})
export class BlockedPlayerModule {}
