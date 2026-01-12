import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { workerAPI, paymentAPI, devAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PaymentPromptBanner from '../components/PaymentPromptBanner';
import { 
  Search, Filter, MapPin, Briefcase, DollarSign, Award, 
  Eye, Phone, Clock, Sparkles, Lock, CheckCircle, LogOut, MessageCircle, PhoneCall
} from 'lucide-react';
import AccessTimer from '../components/AccessTimer';

export default function BrowseWorkers() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    county: '',
    skills: '',
    minPay: '',
    maxPay: '',
    experience: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [accessStatus, setAccessStatus] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    fetchWorkers();
    checkDevMode();
    if (isAuthenticated && user?.role === 'customer') {
      fetchAccessStatus();
    }
  }, [filters, pagination.currentPage, isAuthenticated]);

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

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        ...filters,
      };
      const response = await workerAPI.getAllWorkers(params);
      setWorkers(response.data.workers);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching workers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessStatus = async () => {
    try {
      const response = await paymentAPI.getCustomerAccessStatus();
      setAccessStatus(response.data);
    } catch (err) {
      console.error('Error fetching access status:', err);
    }
  };

  const handleViewContacts = (worker) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      alert('Only customers can view contact details');
      return;
    }

    // Check if customer has active access
    const hasAccess = accessStatus?.hasActiveAccess && 
                     new Date(accessStatus.accessExpiresAt) > new Date();

    if (!hasAccess) {
      setSelectedWorker(worker);
      setShowPaymentModal(true);
    } else {
      // Record contact and show details
      recordContact(worker);
    }
  };

  const recordContact = async (worker) => {
    try {
      await paymentAPI.recordWorkerContact({ workerId: worker._id });
      // Show contact details
      alert(`Contact Details:\nPhone: ${worker.phone || worker.userId?.phone}\nEmail: ${worker.userId?.email || 'N/A'}`);
    } catch (err) {
      console.error('Error recording contact:', err);
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number');
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await paymentAPI.initiateCustomerPayment({ phoneNumber });
      
      // Check if DEV_MODE - payment is immediately successful
      if (response.data.status === 'success' || response.data.devMode) {
        setPaymentLoading(false);
        setShowPaymentModal(false);
        setPhoneNumber('');
        await fetchAccessStatus();
        alert(response.data.message || 'Payment successful! Access unlocked for 48 hours. All contact details are now visible.');
      } else {
        // Production mode - poll for payment status
        alert('Payment initiated! Please complete the payment on your phone.');
        pollPaymentStatus(response.data.paymentId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
      setPaymentLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await paymentAPI.checkPaymentStatus(paymentId);
        const status = response.data.status;

        if (status === 'success') {
          clearInterval(interval);
          setPaymentLoading(false);
          setShowPaymentModal(false);
          setPhoneNumber('');
          await fetchAccessStatus();
          alert('Payment successful! Access unlocked for 48 hours. All contact details are now visible.');
        } else if (status === 'failed' || status === 'cancelled') {
          clearInterval(interval);
          setPaymentLoading(false);
          alert('Payment failed. Please try again.');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
        }
      }
    }, 5000);
  };

  const filteredWorkers = workers.filter(worker => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      worker.userId?.firstName?.toLowerCase().includes(search) ||
      worker.userId?.lastName?.toLowerCase().includes(search) ||
      worker.county?.toLowerCase().includes(search) ||
      worker.skills?.some(skill => skill.toLowerCase().includes(search)) ||
      worker.bio?.toLowerCase().includes(search)
    );
  });

  const hasActiveAccess = accessStatus?.hasActiveAccess && 
                         new Date(accessStatus.accessExpiresAt) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Payment Prompt Banner */}
        <div className="pt-4">
          <PaymentPromptBanner user={user} />
        </div>

        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Browse Workers</h1>
              <div className="flex items-center gap-4">
                {isAuthenticated && user?.role === 'customer' && hasActiveAccess && (
                  <AccessTimer expiresAt={accessStatus.accessExpiresAt} />
                )}
                {/* DEV MODE Logout Button */}
                {devMode && isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout (DEV MODE)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, location, skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Unlock Contacts Banner - Top of Page */}
        {(!isAuthenticated || !hasActiveAccess) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl shadow-xl p-6 mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Unlock All Worker Contacts</h3>
                  <p className="text-primary-100">
                    Pay <span className="font-bold text-2xl">KES 500</span> once to unlock ALL worker phone numbers and emails for 48 hours
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else if (user?.role !== 'customer') {
                    alert('Only customers can unlock contacts');
                  } else {
                    setShowPaymentModal(true);
                  }
                }}
                className="bg-white text-primary-600 px-6 py-3 rounded-lg font-bold hover:bg-primary-50 transition-all shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Unlock Contacts - KES 500
              </button>
            </div>
          </motion.div>
        )}

        {/* Active Access Banner */}
        {isAuthenticated && user?.role === 'customer' && hasActiveAccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-xl p-4 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">You have active access! All contact details are visible.</span>
              </div>
              <AccessTimer expiresAt={accessStatus.accessExpiresAt} />
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                placeholder="e.g., Nairobi"
                value={filters.county}
                onChange={(e) => setFilters({ ...filters, county: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Pay (KES)</label>
              <input
                type="number"
                placeholder="e.g., 10000"
                value={filters.minPay}
                onChange={(e) => setFilters({ ...filters, minPay: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Pay (KES)</label>
              <input
                type="number"
                placeholder="e.g., 25000"
                value={filters.maxPay}
                onChange={(e) => setFilters({ ...filters, maxPay: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
              <input
                type="number"
                placeholder="e.g., 3"
                value={filters.experience}
                onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Workers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading workers...</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No workers found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredWorkers.map((worker) => (
                <WorkerCard
                  key={worker._id}
                  worker={worker}
                  hasAccess={hasActiveAccess}
                  onViewContacts={() => handleViewContacts(worker)}
                  isAuthenticated={isAuthenticated}
                  userRole={user?.role}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                  disabled={pagination.currentPage === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Unlock All Contacts</h3>
            <p className="text-gray-600 mb-6">
              Pay <span className="font-bold text-primary text-2xl">KES 500</span> to unlock all worker contact details for 48 hours.
            </p>
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
                disabled={paymentLoading}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1"
                disabled={paymentLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="btn-primary flex-1"
              >
                {paymentLoading ? 'Processing...' : 'Pay KES 500'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function WorkerCard({ worker, hasAccess, onViewContacts, isAuthenticated, userRole }) {
  // Show contact details if customer has active access
  const showContacts = isAuthenticated && userRole === 'customer' && hasAccess;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = async () => {
    // Record view when card is clicked
    try {
      await workerAPI.recordWorkerView(worker._id);
    } catch (err) {
      console.error('Error recording view:', err);
      // Don't disrupt user experience if view recording fails
    }
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    // Collapsed View - Just name, pay, and views
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleCardClick}
        className="card p-6 hover:shadow-xl transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-xl font-bold text-primary">
              {worker.userId?.firstName?.[0] || 'W'}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">
                {worker.userId?.firstName} {worker.userId?.lastName}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <DollarSign className="w-3 h-3 mr-1" />
                KES {worker.expectedPay?.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-500">
            <Eye className="w-4 h-4" />
            <span className="text-xs">{worker.profileViews || 0}</span>
          </div>
        </div>
        <button className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition">
          View Details →
        </button>
      </motion.div>
    );
  }

  // Expanded View - Full details
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsExpanded(false);
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-4xl font-bold text-primary overflow-hidden">
              {worker.photoUrl ? (
                <img src={worker.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                worker.userId?.firstName?.[0] || 'W'
              )}
            </div>
            <div>
              <h2 className="font-bold text-2xl text-gray-900 mb-2">
                {worker.userId?.firstName} {worker.userId?.lastName}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {worker.county}
                </div>
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {worker.experience} years
                </div>
              </div>
              <div className="flex items-center text-yellow-500">
                <Eye className="w-4 h-4 mr-1" />
                <span className="text-sm">{worker.profileViews || 0} views</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Expected Pay */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Expected Monthly Pay</span>
            <span className="text-2xl font-bold text-primary">KES {worker.expectedPay?.toLocaleString()}</span>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-2">About</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {worker.bio}
          </p>
        </div>

        {/* Age */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Age:</span>
          <p className="font-bold text-lg text-gray-900">{worker.age} years old</p>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {worker.skills?.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-primary-100 text-primary text-sm rounded-full font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Contact Actions - Different based on payment status */}
        {showContacts ? (
          // Paid customer - Show contact buttons
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Contact {worker.userId?.firstName}</h3>
            <div className="space-y-3">
              {/* Phone and Email Display */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">Contact Information</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900 font-medium">{worker.phone || worker.userId?.phone || 'N/A'}</span>
                  </div>
                  {worker.userId?.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">📧</span>
                      <span className="text-gray-900 font-medium">{worker.userId.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Call Button */}
                <a
                  href={`tel:${worker.phone || worker.userId?.phone}`}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  Call
                </a>

                {/* WhatsApp Button */}
                <a
                  href={`https://wa.me/${(worker.phone || worker.userId?.phone || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-400 hover:bg-green-500 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        ) : (
          // Unpaid customer - Show payment prompt
          <div className="mb-6">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 text-center">
              <Lock className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold text-orange-900 mb-2">Contact Details Locked</h3>
              <p className="text-orange-800 text-sm mb-4">
                Pay KES 500 to unlock contact details and chat with {worker.userId?.firstName}
              </p>
              <button
                onClick={() => {
                  onViewContacts();
                  setIsExpanded(false);
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                Unlock Now - KES 500
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => setIsExpanded(false)}
            className="btn-secondary flex-1"
          >
            Close
          </button>
          {!showContacts && (
            <button
              onClick={() => {
                onViewContacts();
                setIsExpanded(false);
              }}
              className="btn-primary flex-1"
            >
              Unlock Contacts
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
