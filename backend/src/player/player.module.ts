import { Module } from '@nestjs/common';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { JwtStrategy } from 'src/auth/passport/auth.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), PassportModule],
  controllers: [PlayerController],
  providers: [PlayerService, JwtStrategy],
  exports: [PlayerService],
})
export class PlayerModule {}
