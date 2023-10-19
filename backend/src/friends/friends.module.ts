import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Friends } from './entities/friends.entity';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/auth/passport/auth.strategy';
import { PlayerModule } from 'src/player/player.module';

@Module({
  imports: [PlayerModule, TypeOrmModule.forFeature([Friends]), PassportModule],
  exports: [FriendsService],
  controllers: [FriendsController],
  providers: [FriendsService, JwtStrategy],
})
export class FriendsModule {}
