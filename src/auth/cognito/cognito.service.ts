import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtVerifierMultiUserPool } from 'aws-jwt-verify/cognito-verifier';
import axios from 'axios';

@Injectable()
export class CognitoService {
  private region: string;
  private cognitoClient: CognitoIdentityProviderClient;
  private idTokenVerifier: CognitoJwtVerifierMultiUserPool<any>;
  private patientJwks: any;
  private providerJwks: any;
  private cognitoConfig: {
    clientId: string;
    clientSecret: string;
    base64EncodedSecret: string;
    cognitoUrl: string;
    callbackUrl: string;
  };

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';
    this.cognitoClient = new CognitoIdentityProviderClient({ region: this.region });
    this.idTokenVerifier = CognitoJwtVerifier.create([
      {
        userPoolId: this.configService.get('COGNITO_PATIENT_POOL_ID'),
        tokenUse: 'id',
        clientId: this.configService.get('COGNITO_PATIENT_CLIENT_ID'),
      },
      {
        userPoolId: this.configService.get('COGNITO_PROVIDER_POOL_ID'),
        tokenUse: 'id',
        clientId: this.configService.get('COGNITO_PROVIDER_CLIENT_ID'),
      },
    ]);

    this.patientJwks = JSON.parse(this.configService.get('COGNITO_PATIENT_PUBLIC_KEYS'));
    this.idTokenVerifier.cacheJwks(
      this.patientJwks,
      this.configService.get('COGNITO_PATIENT_POOL_ID'),
    );

    this.providerJwks = JSON.parse(this.configService.get('COGNITO_PROVIDER_PUBLIC_KEYS'));
    this.idTokenVerifier.cacheJwks(
      this.providerJwks,
      this.configService.get('COGNITO_PROVIDER_POOL_ID'),
    );
  }

  loadConfig(configKey: string) {
    if (configKey === 'patient') {
      // init patient config
      this.cognitoConfig = {
        clientId: this.configService.get('COGNITO_PATIENT_CLIENT_ID'),
        clientSecret: this.configService.get('COGNITO_PATIENT_CLIENT_SECRET'),
        base64EncodedSecret: this._generateBasicAuth(
          this.configService.get('COGNITO_PATIENT_CLIENT_ID'),
          this.configService.get('COGNITO_PATIENT_CLIENT_SECRET'),
        ),
        cognitoUrl: this.configService.get('COGNITO_PATIENT_URL'),
        callbackUrl: this.configService.get('COGNITO_PATIENT_CALLBACK_URL'),
      };
    } else if (configKey === 'therapist') {
      // init therapist config
      this.cognitoConfig = {
        clientId: this.configService.get('COGNITO_PROVIDER_CLIENT_ID'),
        clientSecret: this.configService.get('COGNITO_PROVIDER_CLIENT_SECRET'),
        base64EncodedSecret: this._generateBasicAuth(
          this.configService.get('COGNITO_PROVIDER_CLIENT_ID'),
          this.configService.get('COGNITO_PROVIDER_CLIENT_SECRET'),
        ),
        cognitoUrl: this.configService.get('COGNITO_PROVIDER_URL'),
        callbackUrl: this.configService.get('COGNITO_PROVIDER_CALLBACK_URL'),
      };
    } else {
      // clear the config if no configKey is provided
      // this helps with reducing the side-effects
      for (const key in this.cognitoConfig) {
        delete this.cognitoConfig[key];
      }
    }
  }

  overrideConfig(debug: boolean) {
    if (debug) {
      this.cognitoConfig.callbackUrl = this.configService.get('COGNITO_DEBUG_CALLBACK_URL');
    }
  }

  async exchangeCode(code: string) {
    const tokenExchangeUrl = new URL('/oauth2/token', this.cognitoConfig.cognitoUrl).href;

    try {
      const response = await axios.post(
        tokenExchangeUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          redirect_uri: this.cognitoConfig.callbackUrl,
          code: code,
        }),
        {
          headers: {
            Authorization: `Basic ${this.cognitoConfig.base64EncodedSecret}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.log('error:', error.response.data);
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }
  }

  async refreshTokens(refreshToken: string) {
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.cognitoConfig.clientId,
      AuthParameters: {
        SECRET_HASH: this.cognitoConfig.clientSecret,
        REFRESH_TOKEN: refreshToken,
      },
    });

    const data = await this._runAwsCommand(command);
    return data['AuthenticationResult'];
  }

  async revokeRefreshToken(refreshToken: string) {
    const command = new RevokeTokenCommand({
      ClientId: this.cognitoConfig.clientId,
      Token: refreshToken,
      ClientSecret: this.cognitoConfig.clientSecret,
    });

    await this._runAwsCommand(command);
  }

  verifyIdToken(idToken: string) {
    try {
      const idTokenPayload = this.idTokenVerifier.verifySync(idToken);
      console.log('Token is valid. Payload:', idTokenPayload);
      return idTokenPayload;
    } catch (error) {
      console.log('Invalid token:error:', error);
      throw new HttpException('Invalid Token', HttpStatus.BAD_REQUEST);
    }
  }

  _generateBasicAuth(clientId: string, clientSecret: string) {
    return this._toBase64(`${clientId}:${clientSecret}`);
  }

  _toBase64(data: string) {
    return Buffer.from(data).toString('base64');
  }

  parseJwt(token: string) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  }

  async _runAwsCommand(command: any) {
    try {
      return await this.cognitoClient.send(command);
    } catch (error) {
      const { requestId, cfId, extendedRequestId } = error.$metadata;
      console.log({ requestId, cfId, extendedRequestId });
      throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
    }
  }
}
