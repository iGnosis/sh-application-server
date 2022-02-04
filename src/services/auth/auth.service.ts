import { Injectable } from '@nestjs/common';
import { LoginRequestDto } from 'src/auth/auth.dto';
import { GqlService } from '../gql/gql.service';
import { gql } from 'graphql-request';
import { User } from 'src/types/user';

@Injectable()
export class AuthService {
    constructor(private gqlService: GqlService){}
    
    async login(credentials: LoginRequestDto): Promise<User> {
        const query = gql`query Login($email: String!, $password: String!) {
            user(where: {_and: {email: {_eq: $email}, password: {_eq: $password}}}) {
                id
                lastName
                firstName
                type
                provider
            }
        }`
        const response = await this.gqlService.client.request(query, credentials)
        
        if (response && Array.isArray(response.user) && response.user.length) {
            return response.user[0]
        } else {
            console.log('Invalid credentials');
            return null
        }
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
        const response = await this.gqlService.client.request(query, {userId})
        
        if (response && response.user_by_pk) {
            return response.user_by_pk
        } else {
            console.error('Could not find user');
            return null
        }
    }
}
