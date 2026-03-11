import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT payload structure issued by zorbit-identity.
 */
export interface JwtPayload {
  sub: string;   // user hashId
  org: string;   // organization hashId
  type: 'access' | 'refresh';
  privileges?: string[];
}

/**
 * Passport JWT strategy for validating access tokens.
 * Extracts the JWT from the Authorization Bearer header.
 *
 * The secret must match the one used by zorbit-identity to sign tokens.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
    });
  }

  /**
   * Called after JWT signature is verified.
   * The returned value is attached to request.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
