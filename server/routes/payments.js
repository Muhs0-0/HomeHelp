import express from 'express';
import {
  initiateWorkerPayment,
  initiateCustomerPayment,
  mpesaCallback,
  checkPaymentStatus,
  getCustomerAccessStatus,
  recordWorkerContact,
} from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// M-Pesa callback (no auth required)
router.post('/mpesa/callback', mpesaCallback);

// Protected routes
router.post('/worker/initiate', protect, restrictTo('worker'), initiateWorkerPayment);
router.post('/customer/initiate', protect, restrictTo('customer'), initiateCustomerPayment);
router.get('/status/:paymentId', protect, checkPaymentStatus);
router.get('/customer/access-status', protect, restrictTo('customer'), getCustomerAccessStatus);
router.post('/customer/record-contact', protect, restrictTo('customer'), recordWorkerContact);

export default router;
