import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

/**
 * Middleware that authenticates the request by verifying the JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Verify the token
    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    
    // Attach the user payload to the request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Helper function to require and return the auth token from a request
 * This can be used in route handlers to get the verified token directly
 */
export const requireAuthToken = (req: Request): JwtPayload => {
  const user = req.user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

/**
 * Helper function to check if a user is an instructor
 * Returns the userId if the user is an instructor, otherwise sends 403
 */
export const requireInstructor = (req: Request, res: Response): string | null => {
  const user = requireAuthToken(req);
  
  if (user.role !== 'INSTRUCTOR') {
    res.status(403).json({ message: 'Only instructors can perform this action' });
    return null;
  }
  
  return user.id;
};