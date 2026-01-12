import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../utils/api';
import { 
  Users, Briefcase, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Eye, Phone, Calendar, Search, Filter, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, applicationsRes] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.getAllApplications({ limit: 100 })
      ]);
      
      setAnalytics(analyticsRes.data);
      setApplications(applicationsRes.data.workers);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.applicationStatus === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.userId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.county?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleApprove = async (workerId) => {
    if (!window.confirm('Approve this worker application?')) return;
    
    setActionLoading(workerId);
    try {
      await adminAPI.approveWorker(workerId);
      await loadData();
      alert('Worker approved successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (workerId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(workerId);
    try {
      await adminAPI.rejectWorker(workerId, { reason });
      await loadData();
      alert('Worker rejected');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject worker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (workerId) => {
    setActionLoading(workerId);
    try {
      await adminAPI.toggleWorkerVisibility(workerId);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle visibility');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage workers and monitor platform performance</p>
            </div>
            <button 
              onClick={loadData}
              className="btn-primary text-sm"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === 'applications'}
              onClick={() => setActiveTab('applications')}
            >
              Applications ({applications.length})
            </TabButton>
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </TabButton>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={filteredApplications}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            actionLoading={actionLoading}
            onApprove={handleApprove}
            onReject={handleReject}
            onToggleVisibility={handleToggleVisibility}
            selectedWorker={selectedWorker}
            setSelectedWorker={setSelectedWorker}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// Overview Tab
function OverviewTab({ analytics }) {
  const stats = [
    {
      name: 'Total Workers',
      value: analytics?.workers?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12% from last month'
    },
    {
      name: 'Pending Applications',
      value: analytics?.workers?.pending || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      change: 'Needs review'
    },
    {
      name: 'Active Workers',
      value: analytics?.workers?.visible || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: 'Paid & visible'
    },
    {
      name: 'Total Revenue',
      value: `KES ${(analytics?.revenue?.total || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      change: `From ${analytics?.workers?.paid || 0} workers`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Workers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Most Viewed Profiles</h3>
          </div>
          <div className="p-6">
            {analytics?.mostViewedWorkers?.slice(0, 5).map((worker, index) => (
              <div key={worker._id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {worker.userId?.firstName} {worker.userId?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{worker.county}</p>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{worker.profileViews}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Contacted Workers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Most Contacted Workers</h3>
          </div>
          <div className="p-6">
            {analytics?.mostContactedWorkers?.slice(0, 5).map((worker, index) => (
              <div key={worker._id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {worker.userId?.firstName} {worker.userId?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{worker.county}</p>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{worker.contactCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Applications Tab
function ApplicationsTab({ 
  applications, 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  actionLoading,
  onApprove,
  onReject,
  onToggleVisibility,
  selectedWorker,
  setSelectedWorker
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or county..."
              className="input-field pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-10"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          applications.map((app) => (
            <WorkerCard
              key={app._id}
              worker={app}
              expanded={expandedId === app._id}
              onToggleExpand={() => setExpandedId(expandedId === app._id ? null : app._id)}
              actionLoading={actionLoading}
              onApprove={onApprove}
              onReject={onReject}
              onToggleVisibility={onToggleVisibility}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Worker Card Component
function WorkerCard({ worker, expanded, onToggleExpand, actionLoading, onApprove, onReject, onToggleVisibility }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {worker.userId?.firstName} {worker.userId?.lastName}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[worker.applicationStatus]}`}>
                {worker.applicationStatus}
              </span>
              {worker.paymentStatus === 'paid' && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Paid
                </span>
              )}
              {worker.isVisible && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Visible
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{worker.userId?.email}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>{worker.age} years</span>
              <span>•</span>
              <span>{worker.county}</span>
              <span>•</span>
              <span>{worker.experience} yrs exp</span>
              <span>•</span>
              <span>KES {worker.expectedPay.toLocaleString()}/month</span>
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-6 pt-6 border-t space-y-4">
            {/* Profile Photo */}
            {worker.photoUrl && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  <ImageIcon className="inline w-4 h-4 mr-1" />
                  Profile Photo
                </h4>
                <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img 
                    src={worker.photoUrl} 
                    alt={`${worker.userId?.firstName} ${worker.userId?.lastName}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
              <p className="text-gray-600 text-sm">{worker.bio}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
              <p className="text-gray-600 text-sm">Phone: {worker.phone}</p>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>{worker.profileViews} views</span>
              <span>•</span>
              <Phone className="w-4 h-4" />
              <span>{worker.contactCount} contacts</span>
              <span>•</span>
              <Calendar className="w-4 h-4" />
              <span>Applied {new Date(worker.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {worker.applicationStatus === 'pending' && (
                <>
                  <button
                    onClick={() => onApprove(worker._id)}
                    disabled={actionLoading === worker._id}
                    className="btn-primary flex-1"
                  >
                    {actionLoading === worker._id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => onReject(worker._id)}
                    disabled={actionLoading === worker._id}
                    className="btn-secondary flex-1 !text-red-600 !border-red-600 hover:!bg-red-50"
                  >
                    Reject
                  </button>
                </>
              )}
              
              {worker.applicationStatus === 'approved' && (
                <button
                  onClick={() => onToggleVisibility(worker._id)}
                  disabled={actionLoading === worker._id}
                  className="btn-secondary flex-1"
                >
                  {worker.isVisible ? 'Hide Profile' : 'Show Profile'}
                </button>
              )}

              {worker.rejectionReason && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Rejection Reason:</strong> {worker.rejectionReason}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Analytics Tab
function AnalyticsTab({ analytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Worker Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Worker Statistics</h3>
          <div className="space-y-3">
            <StatRow label="Total Workers" value={analytics?.workers?.total || 0} />
            <StatRow label="Pending" value={analytics?.workers?.pending || 0} color="text-yellow-600" />
            <StatRow label="Approved" value={analytics?.workers?.approved || 0} color="text-green-600" />
            <StatRow label="Rejected" value={analytics?.workers?.rejected || 0} color="text-red-600" />
            <StatRow label="Visible" value={analytics?.workers?.visible || 0} color="text-blue-600" />
            <StatRow label="Paid" value={analytics?.workers?.paid || 0} color="text-purple-600" />
            <StatRow label="Unpaid" value={analytics?.workers?.unpaid || 0} color="text-gray-600" />
          </div>
        </div>

        {/* Customer Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Statistics</h3>
          <div className="space-y-3">
            <StatRow label="Total Customers" value={analytics?.customers?.total || 0} />
            <StatRow label="Active Access" value={analytics?.customers?.active || 0} color="text-green-600" />
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h3>
          <div className="space-y-3">
            <StatRow 
              label="Total Revenue" 
              value={`KES ${(analytics?.revenue?.total || 0).toLocaleString()}`}
              color="text-purple-600"
            />
            <StatRow 
              label="From Workers" 
              value={`KES ${(analytics?.revenue?.fromWorkers || 0).toLocaleString()}`}
            />
            <StatRow 
              label="From Customers" 
              value={`KES ${(analytics?.revenue?.fromCustomers || 0).toLocaleString()}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}