import express from 'express';
import {
  register,
  login,
  adminLogin,
  googleAuth,
  getCurrentUser,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/google', googleAuth);

// Protected routes
router.get('/current-user', protect, getCurrentUser);
router.post('/logout', protect, logout);

export default router;
