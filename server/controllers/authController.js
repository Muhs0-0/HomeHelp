import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

// Register with email/password
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password || !firstName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: role || 'customer',
      isVerified: true, // Auto-verify for now
    });

    await user.save();

    const token = generateToken(user._id, user.role);

    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    // If worker, set initial status
    if (user.role === 'worker') {
      userResponse.applicationStatus = 'not_started';
      userResponse.paymentStatus = 'unpaid';
    }

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Login with email/password
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePicture: user.profilePicture,
    };

    // If worker, include application status
    if (user.role === 'worker') {
      try {
        const Worker = (await import('../models/Worker.js')).default;
        const workerProfile = await Worker.findOne({ userId: user._id });
        if (workerProfile) {
          userResponse.applicationStatus = workerProfile.applicationStatus;
          userResponse.paymentStatus = workerProfile.paymentStatus;
          userResponse.rejectionReason = workerProfile.rejectionReason;
          userResponse.isVisible = workerProfile.isVisible;
        } else {
          userResponse.applicationStatus = 'not_started';
          userResponse.paymentStatus = 'unpaid';
        }
      } catch (workerError) {
        console.error('Error fetching worker profile:', workerError);
      }
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Admin login
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check against env credentials
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Find or create admin user
    let admin = await User.findOne({ email, role: 'admin' });
    
    if (!admin) {
      admin = new User({
        email: process.env.ADMIN_EMAIL,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isVerified: true,
        isActive: true,
      });
      await admin.save();
    }

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth (simplified - you'll need to implement full OAuth flow)
export const googleAuth = async (req, res, next) => {
  try {
    const { googleId, email, firstName, lastName, profilePicture, role } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ message: 'Google authentication data incomplete' });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        googleId,
        email,
        firstName,
        lastName,
        profilePicture,
        role: role || 'customer',
        isVerified: true,
      });
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userProfile = user.getPublicProfile();

    // If user is a worker, fetch their application status and payment status
    if (user.role === 'worker') {
      try {
        const Worker = (await import('../models/Worker.js')).default;
        const workerProfile = await Worker.findOne({ userId: user._id });
        
        if (workerProfile) {
          userProfile.applicationStatus = workerProfile.applicationStatus;
          userProfile.paymentStatus = workerProfile.paymentStatus;
          userProfile.rejectionReason = workerProfile.rejectionReason;
          userProfile.isVisible = workerProfile.isVisible;
        } else {
          // No worker profile yet
          userProfile.applicationStatus = 'not_started';
          userProfile.paymentStatus = 'unpaid';
        }
      } catch (workerError) {
        console.error('Error fetching worker profile:', workerError);
        // Don't fail the auth, just don't include worker info
      }
    }

    res.status(200).json({
      user: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

// Logout (client-side token removal, but we can track it)
export const logout = async (req, res, next) => {
  try {
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
