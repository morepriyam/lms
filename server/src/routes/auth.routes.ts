import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asHandler, asMiddleware } from '../types';

const router = Router();

// Public routes
router.post('/register', asHandler(register));
router.post('/login', asHandler(login));

// Protected routes
router.get('/me', asMiddleware(authenticate), asHandler(getCurrentUser));

export default router; 