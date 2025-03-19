import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
// @ts-ignore - Ignoring type checking for the middleware
router.get('/me', authenticate, getCurrentUser);

export default router; 