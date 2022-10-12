import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const claims = request.user['https://hasura.io/jwt/claims'];
  const userId = claims['x-hasura-user-id'];
  return userId;
});
