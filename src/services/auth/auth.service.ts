import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoginRequestDto } from 'src/auth/auth.dto';
import { GqlService } from '../gql/gql.service';
import { gql } from 'graphql-request';
import { User } from 'src/types/user';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private gqlService: GqlService, private emailService: EmailService, private configService: ConfigService) { }

    async login(credentials: LoginRequestDto): Promise<User> {

        const query = gql`query Login($email: String!) {
            user(where: {_and: {email: {_eq: $email}, password: {}}}) {
              id
              lastName
              firstName
              type
              provider
              password
            }
          }`

        const response = await this.gqlService.client.request(query, { email: credentials.email })

        // no matching email found
        if (!response || !Array.isArray(response.user) || !response.user.length) {
            console.log('Invalid credentials');
            return null
        }

        const isValidPassword = await this.compareHash(credentials.password, response.user[0].password)
        if (!isValidPassword) return null

        // delete password hash from user before sending a response
        delete response.user[0].password
        return response.user[0]
    }

    async getUser(userId: string) {
        const query = gql`query GetUser($userId:uuid!) {
            user_by_pk(id:$userId) {
                id
                createdAt
                email
                firstName
                lastActive
                lastName
                provider
                status
                type
                updatedAt
            }
        }`
        const response = await this.gqlService.client.request(query, { userId })

        if (response && response.user_by_pk) {
            return response.user_by_pk
        } else {
            console.error('Could not find user');
            return null
        }
    }

    async findUserByEmail(email: string): Promise<User> {
        const query = gql`query Login($email: String!) {
            user(where: {email: {_eq: $email}}) {
                id
                lastName
                firstName
                email
                type
                provider
            }
        }`
        const response = await this.gqlService.client.request(query, { email })

        if (response && Array.isArray(response.user) && response.user.length) {
            return response.user[0]
        } else {
            console.log('Invalid credentials');
            return null
        }
    }

    async sendPasswordResetEmail(user: User, url: string) {

        let email: any = {}
        email.to = [user.email]
        email.subject = '[Point Motion] Your Password Reset Link'
        email.body = 'Here is your password reset link (valid only for next 60 minutes) ' + url
        email.text = 'Here is your password reset link (valid only for next 60 minutes). Please copy paste this password reset link in your browser ' + url
        console.log(this.emailService)
        this.emailService.send(email)

    }

    async generatePasswordResetURL(user: User) {
        const uuid = uuidv4()
        const url = this.configService.get('SERVER_BASE_URL') + '/public/auth/set-password/' + uuid
        let dd = new Date()
        dd.setMinutes(dd.getMinutes() + 20)
        // Update the UUID in the database
        const mutation = gql`mutation UpdateResetCode($user:uuid!, $expiry: timestamptz, $code: String) {
            update_user_by_pk(pk_columns: {id: $user}, _set: {resetPasswordExpiry: $expiry, resetPasswordCode: $code}) {
                id
            }
        }`
        const response = await this.gqlService.client.request(mutation, { user: user.id, expiry: dd.toISOString(), code: uuid })

        if (response && response.update_user_by_pk) {
            return url
        } else {
            console.error('Failed to update the reset link');
        }
    }

    async resetPassword(code, password) {
        // Find user with the same code
        const findUserQuery = gql`query FindUser($code: String, $now:timestamptz) {
            user(where: {_and: {resetPasswordCode: {_eq: $code}, resetPasswordExpiry: {_gte: $now}}}) {
                id
                lastName
                firstName
                email
                type
                provider
            }
        }`
        const response = await this.gqlService.client.request(findUserQuery, { code, now: (new Date()).toISOString() })
        if (!response || !Array.isArray(response.user) || response.user.length == 0) {
            throw new HttpException('Invalid or expired link.', HttpStatus.BAD_REQUEST)
        }

        // Take the first user and update it's password
        const id = response.user[0].id
        const updateUserMutation = gql`mutation UpdatePassword ($user:uuid!, $password:String) {
            update_user_by_pk(pk_columns: {id: $user}, _set: {password: $password}) {
                id
                password
            }
        }`
        const updateResponse = await this.gqlService.client.request(updateUserMutation, { user: id, password })
        if (!updateResponse || !updateResponse.update_user_by_pk || updateResponse.update_user_by_pk.password != password) {
            throw new HttpException('Could not update password', HttpStatus.BAD_REQUEST)
        }

        return response.user[0]
    }

    async compareHash(password: string, hashString: string): Promise<boolean> {
        return await bcrypt.compare(password, hashString)
    }
}
