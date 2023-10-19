import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from 'src/auth/passport/auth.strategy';
import { Match } from './entities/match.entity';
import { MatchService } from './match.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match]), PassportModule],
  controllers: [MatchController],
  providers: [MatchService, JwtStrategy],
  exports: [MatchService],
})
export class MatchModule {}
