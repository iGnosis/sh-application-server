import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginRequestDto {
    @ApiProperty({
        description: 'Registered email address'
    })
    @IsEmail()
    email: string;
    
    @ApiProperty({
        description: 'Plain-text password'
    })
    @IsNotEmpty()
    password: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Registered email address'
    })
    email: string;
    
    @ApiProperty({
        enum: ['aman', 'gautam']
    })
    password: string;
}
