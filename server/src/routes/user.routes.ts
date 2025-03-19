import { Router } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  changeUserRole, 
  deleteUser 
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all user routes with authentication
// @ts-ignore - Ignoring type checking for the middleware
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Admin-only routes
// @ts-ignore - Ignoring type checking for the middleware
router.get('/', authorize([UserRole.ADMIN]), getAllUsers);
// @ts-ignore - Ignoring type checking for the middleware
router.patch('/:id/role', authorize([UserRole.ADMIN]), changeUserRole);

export default router; 