import Payment from '../models/Payment.js';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import mpesaService from '../utils/mpesa.js';

// Initiate worker listing fee payment
export const initiateWorkerPayment = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if worker exists and is approved
    const worker = await Worker.findOne({ userId: req.user.userId });

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    if (worker.applicationStatus !== 'approved') {
      return res.status(403).json({ message: 'Your application must be approved first' });
    }

    if (worker.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    const amount = Number(process.env.WORKER_LISTING_FEE) || 300;

    // Create payment record
    const payment = new Payment({
      userId: req.user.userId,
      userRole: 'worker',
      amount,
      purpose: 'worker_listing_fee',
      status: 'pending',
    });

    await payment.save();

    // DEV_MODE: Simulate payment success
    const DEV_MODE = process.env.DEV_MODE === 'true';

    if (DEV_MODE) {
      // Simulate successful payment immediately
      console.log('🔧 DEV_MODE: Simulating worker payment success');
      
      payment.status = 'success';
      payment.mpesaDetails = {
        phoneNumber,
        mpesaReceiptNumber: `DEV${Date.now()}`,
        transactionDate: new Date(),
        checkoutRequestID: `DEV_CHECKOUT_${Date.now()}`,
        merchantRequestID: `DEV_MERCHANT_${Date.now()}`,
        resultCode: '0',
        resultDesc: 'Success (DEV MODE)',
      };
      await payment.save();

      // Process payment immediately
      await processWorkerPayment(payment);

      return res.status(200).json({
        message: 'Payment successful! (DEV MODE - Simulated)',
        paymentId: payment._id,
        status: 'success',
        devMode: true,
      });
    }

    // Production: Initiate M-Pesa STK push
    const mpesaResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      `WORKER${req.user.userId}`,
      'HomeHelp Worker Listing Fee'
    );

    if (mpesaResponse.success) {
      // Update payment with M-Pesa details
      payment.mpesaDetails = {
        phoneNumber,
        checkoutRequestID: mpesaResponse.checkoutRequestID,
        merchantRequestID: mpesaResponse.merchantRequestID,
      };
      await payment.save();

      res.status(200).json({
        message: 'Payment initiated successfully. Please complete payment on your phone.',
        paymentId: payment._id,
        checkoutRequestID: mpesaResponse.checkoutRequestID,
      });
    } else {
      payment.status = 'failed';
      await payment.save();

      res.status(400).json({
        message: mpesaResponse.error || 'Failed to initiate payment',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Initiate customer unlock fee payment
export const initiateCustomerPayment = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if customer already has active access
    const customer = await User.findById(req.user.userId);

    if (customer.customerProfile?.hasActiveAccess) {
      const expiresAt = new Date(customer.customerProfile.accessExpiresAt);
      if (expiresAt > new Date()) {
        return res.status(400).json({
          message: 'You already have active access',
          expiresAt: customer.customerProfile.accessExpiresAt,
        });
      }
    }

    const amount = Number(process.env.CUSTOMER_UNLOCK_FEE) || 500;

    // Create payment record
    const payment = new Payment({
      userId: req.user.userId,
      userRole: 'customer',
      amount,
      purpose: 'customer_unlock_fee',
      status: 'pending',
    });

    await payment.save();

    // DEV_MODE: Simulate payment success
    const DEV_MODE = process.env.DEV_MODE === 'true';

    if (DEV_MODE) {
      // Simulate successful payment immediately
      console.log('🔧 DEV_MODE: Simulating customer payment success');
      
      payment.status = 'success';
      payment.mpesaDetails = {
        phoneNumber,
        mpesaReceiptNumber: `DEV${Date.now()}`,
        transactionDate: new Date(),
        checkoutRequestID: `DEV_CHECKOUT_${Date.now()}`,
        merchantRequestID: `DEV_MERCHANT_${Date.now()}`,
        resultCode: '0',
        resultDesc: 'Success (DEV MODE)',
      };
      await payment.save();

      // Process payment immediately
      await processCustomerPayment(payment);

      return res.status(200).json({
        message: 'Payment successful! (DEV MODE - Simulated)',
        paymentId: payment._id,
        status: 'success',
        devMode: true,
      });
    }

    // Production: Initiate M-Pesa STK push
    const mpesaResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      `CUSTOMER${req.user.userId}`,
      'HomeHelp Contact Unlock Fee'
    );

    if (mpesaResponse.success) {
      // Update payment with M-Pesa details
      payment.mpesaDetails = {
        phoneNumber,
        checkoutRequestID: mpesaResponse.checkoutRequestID,
        merchantRequestID: mpesaResponse.merchantRequestID,
      };
      await payment.save();

      res.status(200).json({
        message: 'Payment initiated successfully. Please complete payment on your phone.',
        paymentId: payment._id,
        checkoutRequestID: mpesaResponse.checkoutRequestID,
      });
    } else {
      payment.status = 'failed';
      await payment.save();

      res.status(400).json({
        message: mpesaResponse.error || 'Failed to initiate payment',
      });
    }
  } catch (error) {
    next(error);
  }
};

// M-Pesa callback endpoint
export const mpesaCallback = async (req, res, next) => {
  try {
    const { Body } = req.body;

    if (!Body || !Body.stkCallback) {
      return res.status(400).json({ message: 'Invalid callback data' });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    // Find payment by CheckoutRequestID
    const payment = await Payment.findOne({
      'mpesaDetails.checkoutRequestID': CheckoutRequestID,
    });

    if (!payment) {
      console.log('Payment not found for CheckoutRequestID:', CheckoutRequestID);
      return res.status(200).json({ message: 'Callback received' });
    }

    // Update payment status
    payment.mpesaDetails.resultCode = ResultCode;
    payment.mpesaDetails.resultDesc = ResultDesc;

    if (ResultCode === 0) {
      // Payment successful
      payment.status = 'success';
      payment.mpesaDetails.transactionDate = new Date();

      // Extract M-Pesa receipt number from callback metadata
      if (CallbackMetadata && CallbackMetadata.Item) {
        const receiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
        if (receiptItem) {
          payment.mpesaDetails.mpesaReceiptNumber = receiptItem.Value;
        }
      }

      await payment.save();

      // Process based on payment purpose
      if (payment.purpose === 'worker_listing_fee') {
        await processWorkerPayment(payment);
      } else if (payment.purpose === 'customer_unlock_fee') {
        await processCustomerPayment(payment);
      }
    } else {
      // Payment failed
      payment.status = 'failed';
      await payment.save();
    }

    res.status(200).json({ message: 'Callback processed successfully' });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(200).json({ message: 'Callback received' }); // Always return 200 to M-Pesa
  }
};

// Process worker payment
async function processWorkerPayment(payment) {
  try {
    const worker = await Worker.findOne({ userId: payment.userId });

    if (worker) {
      worker.paymentStatus = 'paid';
      worker.paymentDetails = {
        amount: payment.amount,
        mpesaReceiptNumber: payment.mpesaDetails.mpesaReceiptNumber,
        transactionDate: payment.mpesaDetails.transactionDate,
        phoneNumber: payment.mpesaDetails.phoneNumber,
      };

      // Make profile visible if approved and paid
      await worker.updateVisibility();

      // Add notification
      await worker.addNotification(
        'payment_success',
        `Payment of KES ${payment.amount} received successfully. Your profile is now visible to customers!`
      );

      console.log('✅ Worker payment processed successfully for user:', payment.userId);
    }
  } catch (error) {
    console.error('Error processing worker payment:', error);
  }
}

// Process customer payment
async function processCustomerPayment(payment) {
  try {
    const customer = await User.findById(payment.userId);

    if (customer) {
      const hoursToAdd = Number(process.env.CUSTOMER_ACCESS_DURATION) || 48;
      const expiresAt = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);

      customer.customerProfile.hasActiveAccess = true;
      customer.customerProfile.accessExpiresAt = expiresAt;
      
      if (!customer.customerProfile.paymentHistory) {
        customer.customerProfile.paymentHistory = [];
      }
      
      customer.customerProfile.paymentHistory.push({
        amount: payment.amount,
        mpesaReceiptNumber: payment.mpesaDetails.mpesaReceiptNumber,
        transactionDate: payment.mpesaDetails.transactionDate,
      });

      await customer.save();

      console.log('✅ Customer payment processed successfully for user:', payment.userId);
    }
  } catch (error) {
    console.error('Error processing customer payment:', error);
  }
}

// Check payment status (for polling)
export const checkPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    res.status(200).json({
      status: payment.status,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// Get customer access status
export const getCustomerAccessStatus = async (req, res, next) => {
  try {
    const customer = await User.findById(req.user.userId);

    if (!customer) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasAccess = customer.customerProfile?.hasActiveAccess && 
                     new Date(customer.customerProfile.accessExpiresAt) > new Date();

    res.status(200).json({
      hasActiveAccess: hasAccess,
      accessExpiresAt: customer.customerProfile?.accessExpiresAt || null,
      paymentHistory: customer.customerProfile?.paymentHistory || [],
    });
  } catch (error) {
    next(error);
  }
};

// Record customer contacting a worker
export const recordWorkerContact = async (req, res, next) => {
  try {
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({ message: 'Worker ID is required' });
    }

    // Check if customer has active access
    const customer = await User.findById(req.user.userId);
    
    if (!customer.customerProfile?.hasActiveAccess || 
        new Date(customer.customerProfile.accessExpiresAt) < new Date()) {
      return res.status(403).json({ message: 'You need to pay to unlock contact details' });
    }

    // Update worker contact count
    const worker = await Worker.findById(workerId);
    if (worker) {
      worker.contactCount += 1;
      await worker.addNotification('contacted', 'A customer has viewed your contact details');
    }

    // Add to customer's contacted workers
    if (!customer.customerProfile.contactedWorkers) {
      customer.customerProfile.contactedWorkers = [];
    }

    const alreadyContacted = customer.customerProfile.contactedWorkers.find(
      c => c.workerId.toString() === workerId
    );

    if (!alreadyContacted) {
      customer.customerProfile.contactedWorkers.push({
        workerId,
        contactedAt: new Date(),
      });
      await customer.save();
    }

    res.status(200).json({ message: 'Contact recorded successfully' });
  } catch (error) {
    next(error);
  }
};
