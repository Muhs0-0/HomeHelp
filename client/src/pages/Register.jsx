import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Users, Briefcase, Mail, Lock, User, Phone } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'customer';
  
  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (role === 'worker' && !formData.phone.trim()) {
      setError('Phone number is required for workers');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        phone: formData.phone || '',
        role: role,
      };

      console.log('🚀 Registering user with role:', role);

      const response = await register(userData);
      
      console.log('✅ Registration response:', response);
      
      // Verify token was set
      const token = localStorage.getItem('token');
      console.log('🔑 Token after registration:', token ? 'SET ✓' : 'NOT SET ✗');
      
      if (!token) {
        throw new Error('Token was not set after registration');
      }
      
      // Small delay to ensure everything is set properly
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🎯 Navigating to:', role === 'worker' ? '/worker/application' : '/workers');
      
      if (role === 'worker') {
        navigate('/worker/application');
      } else {
        navigate('/workers');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center py-12 px-4">
      <motion.div 
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-1xl font-bold text-primary hover:underline">
            {"<-"} Go back 
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-gray-600">Join Kenya's trusted home services marketplace</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I want to join as:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <RoleButton
                icon={<Users className="w-6 h-6" />}
                title="Customer"
                description="Find workers"
                selected={role === 'customer'}
                onClick={() => setRole('customer')}
              />
              <RoleButton
                icon={<Briefcase className="w-6 h-6" />}
                title="Worker"
                description="Get hired"
                selected={role === 'worker'}
                onClick={() => setRole('worker')}
              />
            </div>
          </div>

          <div className={`mb-6 p-4 rounded-lg ${
            role === 'worker' 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <p className="text-sm text-gray-700">
              {role === 'worker' ? (
                <>
                  <strong>Workers:</strong> Complete application after registration. 
                  Admin review required. <strong>KES 300 fee after approval</strong> to activate profile.
                </>
              ) : (
                <>
                  <strong>Customers:</strong> Browse workers for free! 
                  Pay KES 500 to unlock contacts for 48 hours.
                </>
              )}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="Jane"
                    required
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="jane@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone {role === 'worker' && '*'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="0712345678"
                  required={role === 'worker'}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Creating account...' : `Create ${role === 'worker' ? 'Worker' : 'Customer'} Account`}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RoleButton({ icon, title, description, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary bg-primary-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-primary-200'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={`mx-auto mb-2 ${selected ? 'text-primary' : 'text-gray-400'}`}>
        {icon}
      </div>
      <div className={`font-semibold ${selected ? 'text-primary' : 'text-gray-700'}`}>
        {title}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {description}
      </div>
    </motion.button>
  );
}