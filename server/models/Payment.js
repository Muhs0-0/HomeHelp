import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRole: {
      type: String,
      enum: ['worker', 'customer'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['worker_listing_fee', 'customer_unlock_fee'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
    },
    mpesaDetails: {
      phoneNumber: String,
      mpesaReceiptNumber: String,
      transactionDate: Date,
      resultCode: String,
      resultDesc: String,
      checkoutRequestID: String,
      merchantRequestID: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ 'mpesaDetails.mpesaReceiptNumber': 1 });
paymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
