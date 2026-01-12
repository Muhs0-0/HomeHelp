import express from 'express';
import {
  submitApplication,
  getWorkerDashboard,
  updateWorkerProfile,
  getAllWorkers,
  getWorkerById,
  recordWorkerView,
  markNotificationsRead,
  getWorkerStats,
} from '../controllers/workerController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { upload, uploadToCloudinary } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getAllWorkers);
router.post('/:workerId/view', recordWorkerView);
router.get('/:id', getWorkerById);

// Protected worker routes
router.post('/application', protect, restrictTo('worker', 'customer'), upload.single('photo'), uploadToCloudinary, submitApplication);
router.get('/dashboard/me', protect, restrictTo('worker'), getWorkerDashboard);
router.put('/profile', protect, restrictTo('worker'), updateWorkerProfile);
router.put('/notifications/read', protect, restrictTo('worker'), markNotificationsRead);
router.get('/stats/me', protect, restrictTo('worker'), getWorkerStats);

export default router;
