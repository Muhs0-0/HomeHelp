import express from 'express';
import {
  getAllApplications,
  getApplicationDetails,
  approveWorker,
  rejectWorker,
  toggleWorkerVisibility,
  getAnalytics,
  getAllUsers,
  toggleUserStatus,
  getPaymentHistory,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and admin-only
router.use(protect, adminOnly);

// Worker management
router.get('/workers', getAllApplications);
router.get('/workers/:id', getApplicationDetails);
router.put('/workers/:workerId/approve', approveWorker);
router.put('/workers/:workerId/reject', rejectWorker);
router.put('/workers/:workerId/toggle-visibility', toggleWorkerVisibility);

// Analytics
router.get('/analytics', getAnalytics);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/toggle-status', toggleUserStatus);

// Payments
router.get('/payments', getPaymentHistory);

export default router;
