import { Request, Response } from 'express';
import prisma from '../utils/db';
import { userToResponse } from '../types';
import { UserRole } from '@prisma/client';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      users: users.map(userToResponse)
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: userToResponse(user)
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// Update user profile
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, profileImage } = req.body;
    
    // Ensure the user can only update their own profile unless they're an admin
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    if (id !== userId && userRole !== UserRole.ADMIN) {
      res.status(403).json({ message: 'You can only update your own profile' });
      return;
    }

    // Update fields
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(profileImage && { profileImage })
      }
    });

    res.status(200).json({
      user: userToResponse(updatedUser)
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

// Change user role (admin only)
export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    res.status(200).json({
      user: userToResponse(updatedUser)
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ message: 'Server error while changing user role' });
  }
};

// Delete user (admin only or self-delete)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Ensure the user can only delete their own account unless they're an admin
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    if (id !== userId && userRole !== UserRole.ADMIN) {
      res.status(403).json({ message: 'You can only delete your own account' });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
}; 