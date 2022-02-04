import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/services/auth/auth.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { LoginRequestDto } from './auth.dto';

@Controller('auth')
export class AuthController {

    constructor(
        private configService: ConfigService, 
        private authService: AuthService,
        private jwtService: JwtService
    ) {}

    @Post('login')
    @HttpCode(200)
    async login(@Body() body: LoginRequestDto) {
        const user = await this.authService.login(body)
        if(!user) {
            throw new HttpException('Invalid Email Password Combination', HttpStatus.BAD_REQUEST)
        }
        return this.jwtService.generate(user)
    }
}
