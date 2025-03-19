import { Request } from 'express';
import { User, UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileImage?: string | null;
  createdAt: Date;
}

export const userToResponse = (user: User): UserResponse => {
  const { password, updatedAt, ...rest } = user as any;
  return rest;
}; 