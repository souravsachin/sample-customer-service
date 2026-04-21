import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'zorbit:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const REQUIRED_PRIVILEGES_KEY = 'zorbit:requiredPrivileges';
export const RequirePrivileges = (...privileges: string[]) => SetMetadata(REQUIRED_PRIVILEGES_KEY, privileges);
