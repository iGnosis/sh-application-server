import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

export const User = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (!request || !request.user || !request.user['https://hasura.io/jwt/claims']) {
    throw new HttpException(
      'Hasura claims not set for this route',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const hasuraClaims = request.user['https://hasura.io/jwt/claims'];

  request.user = {
    ...request.user,
    orgId: hasuraClaims['x-hasura-organization-id'],
    role: hasuraClaims['x-hasura-default-role'],
  };

  if (data) {
    return request.user[data];
  }

  return request.user;
});
