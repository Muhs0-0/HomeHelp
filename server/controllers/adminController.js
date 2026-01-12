import Worker from '../models/Worker.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';

// Get all worker applications
export const getAllApplications = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.applicationStatus = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const workers = await Worker.find(query)
      .populate('userId', 'firstName lastName email profilePicture')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Worker.countDocuments(query);

    res.status(200).json({
      workers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single worker application details
export const getApplicationDetails = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('userId', 'firstName lastName email profilePicture createdAt')
      .populate('approvedBy', 'firstName lastName');

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.status(200).json({ worker });
  } catch (error) {
    next(error);
  }
};

// Approve worker application
export const approveWorker = async (req, res, next) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    if (worker.applicationStatus === 'approved') {
      return res.status(400).json({ message: 'Worker already approved' });
    }

    worker.applicationStatus = 'approved';
    worker.approvedBy = req.user.userId;
    worker.approvalDate = new Date();
    worker.rejectionReason = null;

    await worker.save();

    // Add notification
    await worker.addNotification(
      'approval',
      'Congratulations! Your application has been approved. Please complete the payment of KES 300 to make your profile visible.'
    );

    res.status(200).json({
      message: 'Worker approved successfully',
      worker,
    });
  } catch (error) {
    next(error);
  }
};

// Reject worker application
export const rejectWorker = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    worker.applicationStatus = 'rejected';
    worker.rejectionReason = reason;
    worker.isVisible = false;

    await worker.save();

    // Add notification
    await worker.addNotification(
      'rejection',
      `Your application has been rejected. Reason: ${reason}`
    );

    res.status(200).json({
      message: 'Worker rejected',
      worker,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle worker visibility (suspend/activate)
export const toggleWorkerVisibility = async (req, res, next) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    worker.isVisible = !worker.isVisible;
    await worker.save();

    res.status(200).json({
      message: `Worker ${worker.isVisible ? 'activated' : 'suspended'}`,
      worker,
    });
  } catch (error) {
    next(error);
  }
};

// Get admin dashboard analytics
export const getAnalytics = async (req, res, next) => {
  try {
    // Worker statistics
    const totalWorkers = await Worker.countDocuments();
    const pendingWorkers = await Worker.countDocuments({ applicationStatus: 'pending' });
    const approvedWorkers = await Worker.countDocuments({ applicationStatus: 'approved' });
    const rejectedWorkers = await Worker.countDocuments({ applicationStatus: 'rejected' });
    const visibleWorkers = await Worker.countDocuments({ isVisible: true });
    const paidWorkers = await Worker.countDocuments({ paymentStatus: 'paid' });
    const unpaidWorkers = await Worker.countDocuments({ 
      applicationStatus: 'approved', 
      paymentStatus: 'unpaid' 
    });

    // Customer statistics
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const activeCustomers = await User.countDocuments({
      role: 'customer',
      'customerProfile.hasActiveAccess': true,
    });

    // Payment statistics
    const workerPayments = await Payment.aggregate([
      { $match: { purpose: 'worker_listing_fee', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const customerPayments = await Payment.aggregate([
      { $match: { purpose: 'customer_unlock_fee', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalRevenue = (workerPayments[0]?.total || 0) + (customerPayments[0]?.total || 0);

    // Most viewed profiles
    const mostViewedWorkers = await Worker.find({ isVisible: true })
      .populate('userId', 'firstName lastName')
      .sort({ profileViews: -1 })
      .limit(10);

    // Most contacted workers
    const mostContactedWorkers = await Worker.find({ isVisible: true })
      .populate('userId', 'firstName lastName')
      .sort({ contactCount: -1 })
      .limit(10);

    // Recent applications
    const recentApplications = await Worker.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Recent payments
    const recentPayments = await Payment.find({ status: 'success' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Payment trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const paymentTrends = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            purpose: '$purpose',
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.status(200).json({
      workers: {
        total: totalWorkers,
        pending: pendingWorkers,
        approved: approvedWorkers,
        rejected: rejectedWorkers,
        visible: visibleWorkers,
        paid: paidWorkers,
        unpaid: unpaidWorkers,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
      revenue: {
        total: totalRevenue,
        fromWorkers: workerPayments[0]?.total || 0,
        fromCustomers: customerPayments[0]?.total || 0,
      },
      mostViewedWorkers,
      mostContactedWorkers,
      recentApplications,
      recentPayments,
      paymentTrends,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (with filtering)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, page = 1, limit = 50 } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate/activate user
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot deactivate admin users' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // If deactivating a worker, hide their profile
    if (!user.isActive && user.role === 'worker') {
      await Worker.findOneAndUpdate(
        { userId: user._id },
        { isVisible: false }
      );
    }

    res.status(200).json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Get payment history
export const getPaymentHistory = async (req, res, next) => {
  try {
    const { status, purpose, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (purpose) {
      query.purpose = purpose;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await Payment.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      payments,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};
