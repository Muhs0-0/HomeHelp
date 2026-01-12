import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { getImageUrl } from '../middleware/upload.js';

// Submit worker application
export const submitApplication = async (req, res, next) => {
  try {
    const { age, county, experience, expectedPay, skills, bio, phone } = req.body;

    // Validate required fields
    if (!age || !county || experience === undefined || !expectedPay || !skills || !bio || !phone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if application already exists (allow updates for any status)
    const existingWorker = await Worker.findOne({ userId: req.user.userId });
    if (existingWorker) {
      // Allow updating existing application regardless of status
      existingWorker.age = age;
      existingWorker.county = county;
      existingWorker.experience = experience;
      existingWorker.expectedPay = expectedPay;
      existingWorker.skills = skills;
      existingWorker.bio = bio;
      existingWorker.phone = phone;

      // Handle photo upload
      if (req.file) {
        if (process.env.DEV_MODE === 'true') {
          // Development: use local file path
          existingWorker.photoUrl = getImageUrl(req.file.filename, req);
        } else {
          // Production: use Cloudinary URL
          existingWorker.photoUrl = req.file.cloudinaryUrl;
        }
      }

      // If application was rejected, reset it to pending
      if (existingWorker.applicationStatus === 'rejected') {
        existingWorker.applicationStatus = 'pending';
        existingWorker.paymentStatus = 'unpaid';
        existingWorker.isVisible = false;
        existingWorker.rejectionReason = null;
      }

      await existingWorker.save();

      return res.status(200).json({
        message: 'Application updated successfully.',
        worker: existingWorker,
      });
    }

    // Handle photo upload
    let photoUrl = null;
    if (req.file) {
      if (process.env.DEV_MODE === 'true') {
        // Development: use local file path
        photoUrl = getImageUrl(req.file.filename, req);
      } else {
        // Production: use Cloudinary URL
        photoUrl = req.file.cloudinaryUrl;
      }
    }

    // Create worker profile
    const worker = new Worker({
      userId: req.user.userId,
      age,
      county,
      experience,
      expectedPay,
      skills,
      bio,
      phone,
      photoUrl,
      applicationStatus: 'pending',
      paymentStatus: 'unpaid',
      isVisible: false,
    });

    await worker.save();

    // Update user role to worker
    await User.findByIdAndUpdate(req.user.userId, { role: 'worker' });

    res.status(201).json({
      message: 'Application submitted successfully. Awaiting admin approval.',
      worker,
    });
  } catch (error) {
    next(error);
  }
};

// Get worker dashboard data
export const getWorkerDashboard = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.userId });

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    // Get unread notifications count
    const unreadCount = worker.notifications.filter(n => !n.isRead).length;

    res.status(200).json({
      worker: {
        ...worker.toObject(),
        unreadNotificationsCount: unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update worker profile
export const updateWorkerProfile = async (req, res, next) => {
  try {
    const { bio, skills, expectedPay, county, phone } = req.body;

    const worker = await Worker.findOne({ userId: req.user.userId });

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    // Only allow updates if not yet approved or if already approved and paid
    if (worker.applicationStatus === 'pending' || worker.isVisible) {
      if (bio) worker.bio = bio;
      if (skills) worker.skills = skills;
      if (expectedPay) worker.expectedPay = expectedPay;
      if (county) worker.county = county;
      if (phone) worker.phone = phone;

      await worker.save();

      res.status(200).json({
        message: 'Profile updated successfully',
        worker,
      });
    } else {
      res.status(403).json({
        message: 'Cannot update profile at this stage',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get all visible workers (public - no auth required)
export const getAllWorkers = async (req, res, next) => {
  try {
    const { county, skills, minPay, maxPay, experience, page = 1, limit = 12 } = req.query;

    const query = { isVisible: true };

    if (county) {
      query.county = { $regex: county, $options: 'i' };
    }

    if (skills) {
      const skillsArray = skills.split(',');
      query.skills = { $in: skillsArray };
    }

    if (minPay || maxPay) {
      query.expectedPay = {};
      if (minPay) query.expectedPay.$gte = Number(minPay);
      if (maxPay) query.expectedPay.$lte = Number(maxPay);
    }

    if (experience) {
      query.experience = { $gte: Number(experience) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const workers = await Worker.find(query)
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ profileViews: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Worker.countDocuments(query);

    res.status(200).json({
      workers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalWorkers: total,
        hasMore: skip + workers.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Record worker profile view (when customer clicks on worker card)
export const recordWorkerView = async (req, res, next) => {
  try {
    const { workerId } = req.params;

    if (!workerId) {
      return res.status(400).json({ message: 'Worker ID is required' });
    }

    const worker = await Worker.findByIdAndUpdate(
      workerId,
      { $inc: { profileViews: 1 } },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.status(200).json({
      message: 'View recorded successfully',
      profileViews: worker.profileViews,
    });
  } catch (error) {
    next(error);
  }
};

// Get single worker profile (public)
export const getWorkerById = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('userId', 'firstName lastName profilePicture email phone');

    if (!worker || !worker.isVisible) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Increment profile views
    worker.profileViews += 1;
    await worker.save();

    // Hide contact details if user doesn't have access
    let workerData = worker.toObject();
    
    // Check if customer has active access
    if (req.user) {
      const customer = await User.findById(req.user.userId);
      if (customer && customer.customerProfile?.hasActiveAccess) {
        // Check if access has expired
        const expiresAt = new Date(customer.customerProfile.accessExpiresAt);
        if (expiresAt > new Date()) {
          // Show contact details
          workerData.showContact = true;
        } else {
          // Access expired - hide contact details
          workerData.showContact = false;
          workerData.phone = null;
          if (workerData.userId) {
            workerData.userId.email = null;
            workerData.userId.phone = null;
          }
        }
      } else {
        // Hide contact details
        workerData.showContact = false;
        workerData.phone = null;
        if (workerData.userId) {
          workerData.userId.email = null;
          workerData.userId.phone = null;
        }
      }
    } else {
      // Not logged in - hide contact
      workerData.showContact = false;
      workerData.phone = null;
      if (workerData.userId) {
        workerData.userId.email = null;
        workerData.userId.phone = null;
      }
    }

    res.status(200).json({ worker: workerData });
  } catch (error) {
    next(error);
  }
};

// Mark notifications as read
export const markNotificationsRead = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.userId });

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    worker.notifications.forEach(notification => {
      notification.isRead = true;
    });

    await worker.save();

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Get worker statistics
export const getWorkerStats = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.userId });

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    const stats = {
      profileViews: worker.profileViews,
      contactCount: worker.contactCount,
      applicationStatus: worker.applicationStatus,
      paymentStatus: worker.paymentStatus,
      isVisible: worker.isVisible,
      memberSince: worker.createdAt,
    };

    res.status(200).json({ stats });
  } catch (error) {
    next(error);
  }
};
