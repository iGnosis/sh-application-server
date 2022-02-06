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

export class RequestResetPasswordDto {
    @ApiProperty({
        description: 'Registered email address'
    })
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        description: 'New Password'
    })
    @IsNotEmpty()
    password: string;
    
    @ApiProperty({
        description: 'Secret code'
    })
    @IsNotEmpty()
    code: string
}
