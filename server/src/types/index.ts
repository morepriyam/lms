import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '@prisma/client';
import type { RequestHandler } from 'express';

// Auth types
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

// User types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileImage?: string | null;
  createdAt: Date;
}

// Helper for converting User model to response object
export const userToResponse = (user: User): UserResponse => {
  const { password, updatedAt, ...rest } = user as any;
  return rest;
};

/**
 * Utility to safely cast Express request handlers
 * Use this instead of manual 'as unknown as RequestHandler' casting
 */
export const asHandler = <T extends (...args: any[]) => any>(handler: T): RequestHandler => {
  return handler as unknown as RequestHandler;
};

/**
 * Utility to safely cast Express middleware
 */
export const asMiddleware = <T extends (...args: any[]) => any>(middleware: T): RequestHandler => {
  return middleware as unknown as RequestHandler;
}; 