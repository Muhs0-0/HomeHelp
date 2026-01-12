import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Application Details
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: 18,
      max: 65,
    },
    county: {
      type: String,
      required: [true, 'County/location is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: 0,
      max: 50,
    },
    expectedPay: {
      type: Number,
      required: [true, 'Expected monthly pay is required'],
      min: 5000,
      max: 50000,
    },
    skills: {
      type: [String],
      required: [true, 'At least one skill is required'],
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Please select at least one skill'
      },
    },
    bio: {
      type: String,
      required: [true, 'Bio is required'],
      minlength: [50, 'Bio must be at least 50 characters'],
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    
    // Profile Photo
    photoUrl: {
      type: String,
      default: null,
    },
    
    // Status Management
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    isVisible: {
      type: Boolean,
      default: false, // Only visible after approval AND payment
    },
    
    // Payment Details
    paymentDetails: {
      amount: Number,
      mpesaReceiptNumber: String,
      transactionDate: Date,
      phoneNumber: String,
    },
    
    // Admin Actions
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    
    // Analytics
    profileViews: {
      type: Number,
      default: 0,
    },
    contactCount: {
      type: Number,
      default: 0,
    },
    
    // Notifications
    notifications: [{
      type: {
        type: String,
        enum: ['approval', 'rejection', 'payment_success', 'profile_viewed', 'contacted'],
      },
      message: String,
      isRead: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
workerSchema.index({ applicationStatus: 1, paymentStatus: 1, isVisible: 1 });
workerSchema.index({ userId: 1 });
workerSchema.index({ county: 1, skills: 1 });

// Method to check if worker profile should be visible
workerSchema.methods.updateVisibility = async function() {
  this.isVisible = this.applicationStatus === 'approved' && this.paymentStatus === 'paid';
  await this.save();
};

// Add notification
workerSchema.methods.addNotification = async function(type, message) {
  this.notifications.unshift({ type, message });
  // Keep only last 50 notifications
  if (this.notifications.length > 50) {
    this.notifications = this.notifications.slice(0, 50);
  }
  await this.save();
};

export default mongoose.model('Worker', workerSchema);
