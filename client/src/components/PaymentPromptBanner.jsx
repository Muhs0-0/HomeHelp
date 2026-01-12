import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, X, AlertCircle } from 'lucide-react';
import { paymentAPI } from '../utils/api';

export default function PaymentPromptBanner({ user, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Only show if user is a worker, approved, and hasn't paid
  if (!user || user.role !== 'worker' || user.applicationStatus !== 'approved' || user.paymentStatus === 'paid' || dismissed) {
    return null;
  }

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await paymentAPI.initiatePayment({
        amount: 300,
        description: 'Worker Profile Activation'
      });

      if (response.data.paymentUrl) {
        // Redirect to M-Pesa payment
        window.location.href = response.data.paymentUrl;
      } else {
        setPaymentStatus({
          success: false,
          message: 'Unable to initiate payment. Please try again.'
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed. Please try again.');
      setPaymentStatus({
        success: false,
        message: err.response?.data?.message || 'Payment failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-xl p-6 mb-6 relative"
    >
      {/* Close Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-2 hover:bg-orange-200 rounded-lg transition-colors"
        aria-label="Dismiss payment prompt"
      >
        <X className="w-5 h-5 text-orange-600" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 pt-1">
          <AlertCircle className="w-6 h-6 text-orange-600" />
        </div>
        
        <div className="flex-1 pr-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Complete Your Profile Activation
          </h3>
          <p className="text-gray-700 mb-4">
            Your profile has been <span className="font-semibold text-green-600">approved by admin</span>! 
            Complete a one-time payment of <span className="font-bold text-orange-600">KES 300</span> to make your profile visible to customers and start getting hired.
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <DollarSign className="w-5 h-5" />
            {loading ? 'Processing...' : 'Pay KES 300 Now'}
          </button>

          <p className="text-sm text-gray-600 mt-3">
            💳 Secure payment via M-Pesa
          </p>
        </div>
      </div>
    </motion.div>
  );
}
