import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { GqlService } from 'src/services/gql/gql.service';
import { GetTokensApi, RefreshTokensApi } from '../auth.dto';
import { CognitoService } from './cognito.service';

@Controller('cognito')
export class CognitoController {
  constructor(private cognitoService: CognitoService, private gqlService: GqlService) {}

  /*
  X-Pointmotion-User: patient | therapist
  X-Pointmotion-Identifiy-Provider: cognito

  In the auth request, load env^ variables depending on these.

  Build an interceptor at controller level, it will load the required configs \
  depending on the custom HTTP headers.
  */

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: GetTokensApi,
    @Headers('x-pointmotion-user') user: string,
    @Headers('x-pointmotion-debug') debug: boolean,
  ) {
    // load user config
    this.cognitoService.loadConfig(user);

    // override config with debug settings
    this.cognitoService.overrideConfig(debug);

    console.log('config loaded');
    const code = body.code;
    const cognitoResponse = await this.cognitoService.exchangeCode(code);

    // decode the 'id_token'
    // insert patient with id_token.sub = patient.id
    // and id_token.email = patient.email
    try {
      const idToken = cognitoResponse.id_token;
      const idTokenPayload = this.cognitoService.parseJwt(idToken);
      if (user === 'patient') {
        const query = `
        mutation InsertPatient($patientId: uuid = "", $email: String = "") {
          insert_patient(objects: {id: $patientId, email: $email}) {
            affected_rows
          }
        }`;

        console.log('Inserting patient after Cognito sign-up...');
        await this.gqlService.client.request(query, {
          patientId: idTokenPayload.sub,
          email: idTokenPayload.email,
        });
      }
    } catch (error) {
      // fails when patient with email already exists.
      console.log('error:', error);
    }
    return {
      status: 'success',
      data: cognitoResponse,
    };
  }

  @HttpCode(200)
  @Post('refresh-tokens')
  async refreshTokens(@Body() body: RefreshTokensApi, @Headers('x-pointmotion-user') user: string) {
    // load user config
    this.cognitoService.loadConfig(user);

    const cognitoResponse = await this.cognitoService.refreshTokens(body.refreshToken);
    return {
      status: 'success',
      data: cognitoResponse,
    };
  }

  @HttpCode(200)
  @Post('logout')
  async revokeRefreshToken(
    @Body() body: RefreshTokensApi,
    @Headers('x-pointmotion-user') user: string,
  ) {
    // load user config
    this.cognitoService.loadConfig(user);
    const cognitoResponse = this.cognitoService.revokeRefreshToken(body.refreshToken);
    return {
      status: 'success',
      data: cognitoResponse,
    };
  }
}
