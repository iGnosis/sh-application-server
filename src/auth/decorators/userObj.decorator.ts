import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserObj = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const hasuraClaims = JSON.parse(request.user['https://hasura.io/jwt/claims']);
  return {
    hasuraClaims,
    ...request.user,
  };
});
