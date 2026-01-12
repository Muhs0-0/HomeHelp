import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { workerAPI, paymentAPI, devAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, Bell, CheckCircle, Clock, DollarSign, TrendingUp, 
  User, MapPin, Briefcase, Award, Phone, AlertCircle,
  Loader2, Sparkles, Shield, LogOut
} from 'lucide-react';

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { logout, refreshUser } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    checkDevMode();
  }, []);

  const checkDevMode = async () => {
    try {
      const response = await devAPI.checkDevMode();
      setDevMode(response.data.devMode);
    } catch (err) {
      console.error('Error checking dev mode:', err);
      setDevMode(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Set up auto-refresh for pending applications (every 10 seconds) and also refresh auth context
  useEffect(() => {
    if (worker?.applicationStatus === 'pending') {
      refreshIntervalRef.current = setInterval(async () => {
        try {
          await fetchDashboardData();
          await refreshUser(); // Also refresh user context to check for updates
        } catch (err) {
          console.error('Error during auto-refresh:', err);
        }
      }, 10000); // Check every 10 seconds for faster feedback
    } else if (worker?.applicationStatus === 'approved' && worker?.paymentStatus === 'unpaid') {
      // Also refresh for approved but unpaid workers
      refreshIntervalRef.current = setInterval(async () => {
        try {
          await refreshUser();
        } catch (err) {
          console.error('Error refreshing user:', err);
        }
      }, 15000);
    } else {
      // Clear interval if not pending or approved+unpaid
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [worker?.applicationStatus, worker?.paymentStatus, refreshUser]);

  // Prevent accidental navigation away (but allow page refresh)
  useEffect(() => {
    const isPending = worker?.applicationStatus === 'pending';
    
    const handleBeforeUnload = (e) => {
      // Only warn if trying to navigate away, not for page refresh
      // Page refresh is safe because token is in localStorage
      if (isPending && e.type === 'beforeunload') {
        e.preventDefault();
        e.returnValue = 'Your application is under review. Refreshing the page is safe - you\'ll stay logged in.';
        return e.returnValue;
      }
    };

    if (isPending) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [worker?.applicationStatus]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await workerAPI.getDashboard();
      setWorker(response.data.worker);
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      // Don't redirect on error - just show error message
      if (err.response?.status === 401) {
        // Token expired - show error but don't redirect
        // User can refresh again or navigate manually
        setError('Session expired. Please try refreshing or login again.');
        return;
      }
      if (err.response?.status === 404) {
        // No worker profile found - this is okay, show message
        setWorker(null);
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const response = await paymentAPI.initiateWorkerPayment({ phoneNumber });
      
      // Check if DEV_MODE - payment is immediately successful
      if (response.data.status === 'success' || response.data.devMode) {
        setPaymentStatus({
          type: 'success',
          message: response.data.message || 'Payment successful! Your profile is now visible to customers.',
        });
        setPaymentLoading(false);
        
        // Refresh dashboard after 2 seconds
        setTimeout(() => {
          fetchDashboardData();
        }, 2000);
      } else {
        // Production mode - poll for payment status
        setPaymentStatus({
          type: 'initiated',
          message: 'Payment initiated! Please complete the payment on your phone.',
          paymentId: response.data.paymentId,
          checkoutRequestID: response.data.checkoutRequestID,
        });

        // Poll for payment status
        pollPaymentStatus(response.data.paymentId);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment');
      setPaymentLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    const maxAttempts = 60; // Poll for 5 minutes (5 seconds * 60)
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await paymentAPI.checkPaymentStatus(paymentId);
        const status = response.data.status;

        if (status === 'success') {
          clearInterval(interval);
          setPaymentStatus({
            type: 'success',
            message: 'Payment successful! Your profile is now visible to customers.',
          });
          setPaymentLoading(false);
          setShowPaymentModal(false);
          
          // Refresh dashboard data
          setTimeout(() => {
            fetchDashboardData();
          }, 2000);
        } else if (status === 'failed' || status === 'cancelled') {
          clearInterval(interval);
          setPaymentStatus({
            type: 'failed',
            message: 'Payment failed or was cancelled. Please try again.',
          });
          setPaymentLoading(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentStatus({
            type: 'timeout',
            message: 'Payment is taking longer than expected. Please check your phone or try again.',
          });
          setPaymentLoading(false);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const markNotificationsRead = async () => {
    try {
      await workerAPI.markNotificationsRead();
      fetchDashboardData();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Application Found</h2>
          <p className="text-gray-600 mb-6">You haven't submitted an application yet.</p>
          <button
            onClick={() => navigate('/worker/application')}
            className="btn-primary"
          >
            Submit Application
          </button>
        </div>
      </div>
    );
  }

  // Application Status: Pending
  if (worker.applicationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* DEV MODE Logout Button */}
          {devMode && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout (DEV MODE)</span>
              </button>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 text-center"
          >
            <div className="mb-6">
              <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Application Under Review</h2>
              <p className="text-gray-600 text-lg">
                Your application has been submitted and is being reviewed by our admin team.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This page will automatically refresh every 30 seconds to check for updates.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-3">What happens next?</h3>
              <ul className="text-left text-yellow-700 space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Admin reviews your application (usually 1-2 business days)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>You'll receive a notification when a decision is made</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>If approved, you'll be prompted to pay KES 300 to activate your profile</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Please keep this page open. You'll be automatically notified when your application is reviewed.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={fetchDashboardData}
                className="btn-primary"
              >
                Refresh Status Now
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Application Status: Rejected
  if (worker.applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* DEV MODE Logout Button */}
          {devMode && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout (DEV MODE)</span>
              </button>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 text-center"
          >
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Application Rejected</h2>
            {worker.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="font-semibold text-red-800 mb-2">Reason:</p>
                <p className="text-red-700">{worker.rejectionReason}</p>
              </div>
            )}
            <button
              onClick={() => navigate('/worker/application')}
              className="btn-primary"
            >
              Review Application
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Application Approved - Payment Required
  if (worker.applicationStatus === 'approved' && worker.paymentStatus === 'unpaid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* DEV MODE Logout Button */}
          {devMode && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout (DEV MODE)</span>
              </button>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-xl p-8 text-center border-4 border-green-400"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              🎉 You've Been Approved!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-700 mb-8"
            >
              Congratulations! Your application has been approved. Complete your payment to make your profile visible to customers.
            </motion.p>

            {/* Payment Form - Always shown when approved and unpaid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg p-6 mb-6 max-w-md mx-auto shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h3>
              <p className="text-gray-600 mb-4">
                Pay <span className="font-bold text-primary text-2xl">KES 300</span> to activate your profile
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {paymentStatus && (
                <div className={`mb-4 p-4 rounded-lg ${
                  paymentStatus.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : paymentStatus.type === 'failed'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}>
                  <p className="font-semibold">{paymentStatus.message}</p>
                  {paymentStatus.type === 'initiated' && (
                    <div className="mt-2">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      <span className="text-sm">Waiting for payment confirmation...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  className="input-field"
                  disabled={paymentLoading || paymentStatus?.type === 'initiated'}
                />
              </div>

              <button
                onClick={handlePayment}
                disabled={paymentLoading || paymentStatus?.type === 'initiated'}
                className="btn-primary w-full"
              >
                {paymentLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </span>
                ) : paymentStatus?.type === 'initiated' ? (
                  'Payment in Progress...'
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 inline mr-2" />
                    Pay KES 300 via M-Pesa
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 mt-4">
                You'll receive an M-Pesa STK push on your phone. Enter your PIN to complete the payment.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Full Dashboard - Profile is visible
  if (worker.isVisible && worker.paymentStatus === 'paid') {
    const unreadNotifications = worker.notifications?.filter(n => !n.isRead).length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Success Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-8 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Sparkles className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">Your Profile is Now Live! 🎉</h3>
                  <p className="text-green-100">Customers can now see and contact you. Start tracking your profile views and contacts below.</p>
                </div>
              </div>
              <Shield className="w-12 h-12 text-green-200" />
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <Eye className="w-8 h-8 text-blue-500" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{worker.profileViews || 0}</h3>
              <p className="text-gray-600">Profile Views</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <Phone className="w-8 h-8 text-green-500" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{worker.contactCount || 0}</h3>
              <p className="text-gray-600">Times Contacted</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <Bell className="w-8 h-8 text-purple-500" />
                {unreadNotifications > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{unreadNotifications}</h3>
              <p className="text-gray-600">Unread Notifications</p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Profile Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold">{worker.county}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Briefcase className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-semibold">{worker.experience} years</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Expected Pay</p>
                    <p className="font-semibold">KES {worker.expectedPay?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Award className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Skills</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {worker.skills?.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-primary-50 text-primary text-sm rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/worker/application')}
                className="btn-secondary w-full mt-6"
              >
                Edit Profile
              </button>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                {unreadNotifications > 0 && (
                  <button
                    onClick={markNotificationsRead}
                    className="text-sm text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {worker.notifications && worker.notifications.length > 0 ? (
                  worker.notifications.slice(0, 10).map((notification, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        !notification.isRead
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No notifications yet</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
