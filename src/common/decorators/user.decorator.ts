import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const hasuraClaims = request.user['https://hasura.io/jwt/claims'];
  // console.log(hasuraClaims);

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
