import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/index.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from './auth.validator.js';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new ConflictError('Email is already registered');
      }
      throw new ConflictError('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName || input.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    // Create initial analytics record
    await prisma.userAnalytics.create({
      data: { userId: user.id },
    });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, ...tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = jwt.verify(
        refreshToken,
        config.JWT_REFRESH_SECRET
      ) as TokenPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return { user, ...tokens };
    } catch (err) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  private generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
