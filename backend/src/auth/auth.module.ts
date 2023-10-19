import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { PlayerModule } from 'src/player/player.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './passport/auth.strategy';

@Module({
  imports: [
    PlayerModule,
    PassportModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
