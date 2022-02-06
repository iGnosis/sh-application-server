import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from 'src/services/auth/auth.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { LoginRequestDto } from './auth.dto';

@Controller('auth')
export class AuthController {

    constructor(
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
        const token = this.jwtService.generate(user)
        return {token, user}
    }

    @Get('me')
    @ApiBearerAuth('access-token')
    async me(@Headers() headers) {
        // Get user id from the verified JWT token
        const userDetails = this.jwtService.verify(headers.authorization)
        if(!userDetails) {
            throw new HttpException('Invalid JWT', HttpStatus.BAD_REQUEST)
        }
        console.log(userDetails.id)
        
        // fetch user details from the database
        const user = await this.authService.getUser(userDetails.id)
        return user
    }
}
