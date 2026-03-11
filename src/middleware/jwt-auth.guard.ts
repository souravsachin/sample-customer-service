import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that requires a valid JWT access token.
 * Uses the 'jwt' Passport strategy defined in JwtStrategy.
 *
 * The JWT is issued by zorbit-identity (accounts.platform.com).
 * This service validates the token using the shared JWT_SECRET.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
