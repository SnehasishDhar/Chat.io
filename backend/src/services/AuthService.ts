import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/UserRepository";
import { IUser } from "../models/User";

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

export class AuthService {
  private getAccessSecret(): string {
    return process.env.JWT_ACCESS_SECRET || "default_access_secret_123";
  }

  private getRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || "default_refresh_secret_456";
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(user: IUser): string {
    return jwt.sign(
      { userId: user._id.toString(), email: user.email },
      this.getAccessSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { userId: user._id.toString() },
      this.getRefreshSecret(),
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error("User already exists with this email");
    }

    const passwordHash = await this.hashPassword(password);
    const user = await userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Save refresh token to DB
    await userRepository.update(user._id.toString(), { refreshToken });

    return { user, accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update refresh token in DB
    await userRepository.update(user._id.toString(), { refreshToken });

    return { user, accessToken, refreshToken };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(token, this.getRefreshSecret()) as { userId: string };
      const user = await userRepository.findById(decoded.userId);
      if (!user || user.refreshToken !== token) {
        throw new Error("Invalid refresh token");
      }

      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      await userRepository.update(user._id.toString(), { refreshToken: newRefreshToken });

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new Error("Invalid refresh token");
    }
  }

  async logout(userId: string): Promise<void> {
    await userRepository.update(userId, { refreshToken: undefined });
  }
}

export const authService = new AuthService();
