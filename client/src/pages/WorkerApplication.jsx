import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { workerAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PaymentPromptBanner from '../components/PaymentPromptBanner';
import { MapPin, Briefcase, DollarSign, Award, FileText, Phone, CheckCircle, Camera } from 'lucide-react';

const KENYAN_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale',
  'Garissa', 'Kakamega', 'Nyeri', 'Meru', 'Naivasha', 'Machakos', 'Kiambu', 'Kajiado',
  'Kilifi', 'Kericho', 'Bungoma', 'Kisii', 'Migori', 'Embu', 'Homa Bay', 'Nandi',
  'Baringo', 'Bomet', 'Busia', 'Elgeyo-Marakwet', 'Isiolo', 'Kirinyaga', 'Kitui',
  'Kwale', 'Laikipia', 'Lamu', 'Makueni', 'Mandera', 'Marsabit', 'Murang\'a',
  'Narok', 'Nyamira', 'Nyandarua', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

const SKILL_OPTIONS = [
  'Cooking',
  'Cleaning',
  'Laundry',
  'Childcare (Nanny)',
  'Elder Care',
  'Sweeping Compound',
  'Dishwashing',
  'Ironing',
  'Grocery Shopping',
  'Pet Care',
  'Gardening',
  'General Housekeeping'
];

const PAY_OPTIONS = [
  { value: 7000, label: 'KES 7,000' },
  { value: 10000, label: 'KES 10,000' },
  { value: 15000, label: 'KES 15,000' },
  { value: 20000, label: 'KES 20,000' },
  { value: 25000, label: 'KES 25,000' },
  { value: 0, label: 'Custom Amount' }
];

export default function WorkerApplication() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '',
    county: '',
    experience: '',
    expectedPay: 10000,
    customPay: '',
    skills: [],
    bio: '',
    phone: '',
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApprovedMessage, setShowApprovedMessage] = useState(false);
  const [showRejectionMessage, setShowRejectionMessage] = useState(false);

  // Check user status on mount and periodically
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user?.role === 'worker') {
        // If approved, redirect to dashboard
        if (user.applicationStatus === 'approved') {
          setShowApprovedMessage(true);
          setTimeout(() => {
            navigate('/worker/dashboard');
          }, 2000);
          return;
        }
        
        // If rejected, show rejection message
        if (user.applicationStatus === 'rejected') {
          setShowRejectionMessage(true);
          return;
        }
      }
    };

    checkUserStatus();

    // Set up auto-refresh of user status every 10 seconds if pending
    let interval;
    if (user?.role === 'worker' && user.applicationStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          await refreshUser();
        } catch (err) {
          console.error('Error refreshing user status:', err);
        }
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.role, user?.applicationStatus, navigate, refreshUser]);

  // Load existing worker data on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const response = await workerAPI.getDashboard();
        const worker = response.data.worker;
        
        if (worker) {
          // Pre-fill form with existing data
          setFormData({
            age: worker.age?.toString() || '',
            county: worker.county || '',
            experience: worker.experience?.toString() || '',
            expectedPay: worker.expectedPay || 10000,
            customPay: !PAY_OPTIONS.some(opt => opt.value === worker.expectedPay) ? worker.expectedPay?.toString() : '',
            skills: worker.skills || [],
            bio: worker.bio || '',
            phone: worker.phone || '',
            photo: null
          });
          
          // Set photo preview if exists
          if (worker.photoUrl) {
            setPhotoPreview(worker.photoUrl);
          }
        }
      } catch (err) {
        console.error('Error loading existing application:', err);
        // If no existing application, form stays empty - that's fine
      }
    };

    loadExistingData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        photo: file
      });
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handlePayChange = (value) => {
    setFormData({
      ...formData,
      expectedPay: value,
      customPay: value === 0 ? formData.customPay : ''
    });
  };

  const validateStep = (currentStep) => {
    setError('');

    if (currentStep === 1) {
      if (!formData.age || formData.age < 18 || formData.age > 65) {
        setError('Age must be between 18 and 65');
        return false;
      }
      if (!formData.county) {
        setError('Please select your county');
        return false;
      }
      if (!formData.experience || formData.experience < 0) {
        setError('Please enter your years of experience');
        return false;
      }
    }

    if (currentStep === 2) {
      const finalPay = formData.expectedPay === 0 ? Number(formData.customPay) : formData.expectedPay;
      if (!finalPay || finalPay < 5000 || finalPay > 100000) {
        setError('Expected pay must be between KES 5,000 and KES 100,000');
        return false;
      }
      if (formData.skills.length === 0) {
        setError('Please select at least one skill');
        return false;
      }
    }

    if (currentStep === 3) {
      if (!formData.bio || formData.bio.length < 50) {
        setError('Bio must be at least 50 characters');
        return false;
      }
      if (!formData.phone) {
        setError('Phone number is required');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(3)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalPay = formData.expectedPay === 0 ? Number(formData.customPay) : formData.expectedPay;

      // Use FormData to handle file upload
      const applicationData = new FormData();
      applicationData.append('age', Number(formData.age));
      applicationData.append('county', formData.county);
      applicationData.append('experience', Number(formData.experience));
      applicationData.append('expectedPay', finalPay);
      applicationData.append('skills', JSON.stringify(formData.skills));
      applicationData.append('bio', formData.bio.trim());
      applicationData.append('phone', formData.phone.trim());
      
      // Add photo if selected
      if (formData.photo) {
        applicationData.append('photo', formData.photo);
      }

      console.log('Submitting application with photo'); // Debug log

      const response = await workerAPI.submitApplication(applicationData);

      console.log('Application submitted successfully:', response.data); // Debug log

      // Refresh user status after submission
      await refreshUser();

      // Don't navigate away - let the useEffect handle it based on new status
      setError('');
    } catch (err) {
      console.error('Application submission error:', err); // Debug log
      console.error('Error response:', err.response?.data); // Debug log

      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit application. Please try again.';
      setError(errorMessage);

      // If it's an auth error, redirect to login
      if (err.response?.status === 401) {
        alert('Your session has expired. Please login again.');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Approved Message */}
        {showApprovedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl text-center"
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">🎉 You've Been Approved!</h2>
            <p className="text-green-600">Congratulations! Your application has been approved. Redirecting you to your dashboard...</p>
          </motion.div>
        )}

        {/* Rejection Message */}
        {showRejectionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl text-center"
          >
            <h2 className="text-2xl font-bold text-red-700 mb-2">⚠️ Application Rejected</h2>
            <p className="text-red-600 mb-4">{user?.rejectionReason || 'Your application did not meet our requirements.'}</p>
            <p className="text-gray-600">You can review and submit a new application below.</p>
          </motion.div>
        )}

        {/* Payment Prompt Banner */}
        <PaymentPromptBanner user={user} />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Worker Application</h1>
          <p className="text-gray-600">Complete your profile to get hired</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Basic Info</span>
            <span>Skills & Pay</span>
            <span>About You</span>
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Age *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., 28"
                    min="18"
                    max="65"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be between 18-65 years</p>
                </div>

                {/* County */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    County/Location *
                  </label>
                  <select
                    name="county"
                    value={formData.county}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Select your county</option>
                    {KENYAN_COUNTIES.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="inline w-4 h-4 mr-1" />
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., 3"
                    min="0"
                    max="50"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Years working in domestic services</p>
                </div>
              </div>
            )}

            {/* Step 2: Skills & Pay */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills & Expected Pay</h2>

                {/* Expected Pay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline w-4 h-4 mr-1" />
                    Expected Monthly Pay *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {PAY_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePayChange(option.value)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.expectedPay === option.value
                            ? 'border-primary bg-primary-50 text-primary'
                            : 'border-gray-200 hover:border-primary-200'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {formData.expectedPay === 0 && (
                    <input
                      type="number"
                      name="customPay"
                      value={formData.customPay}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter custom amount (KES)"
                      min="5000"
                      max="100000"
                    />
                  )}
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Award className="inline w-4 h-4 mr-1" />
                    Your Skills * (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className={`p-3 rounded-lg border-2 text-sm text-left transition-all ${formData.skills.includes(skill)
                            ? 'border-primary bg-primary-50 text-primary font-medium'
                            : 'border-gray-200 hover:border-primary-200'
                          }`}
                      >
                        <CheckCircle className={`inline w-4 h-4 mr-2 ${formData.skills.includes(skill) ? 'text-primary' : 'text-gray-300'
                          }`} />
                        {skill}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {formData.skills.length} skill{formData.skills.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Bio & Contact */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tell Us About Yourself</h2>

                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Camera className="inline w-4 h-4 mr-1" />
                    Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        id="photo-input"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-input"
                        className="block cursor-pointer"
                      >
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary hover:bg-primary-50 transition-all">
                          <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
                        </div>
                      </label>
                    </div>
                    {photoPreview && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg border-2 border-primary"
                        />
                      </div>
                    )}
                  </div>
                  {formData.photo && (
                    <p className="text-sm text-green-600 mt-2">✓ Photo selected: {formData.photo.name}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline w-4 h-4 mr-1" />
                    Your Bio * (Minimum 50 characters)
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="6"
                    className="input-field"
                    placeholder="Tell potential employers about yourself, your experience, what makes you a great worker, etc."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/500 characters
                    {formData.bio.length < 50 && ` (${50 - formData.bio.length} more needed)`}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Phone Number * (For M-Pesa & Customer Contact)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0712345678"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for M-Pesa payments and customer contact
                  </p>
                </div>

                {/* Important Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">📋 Next Steps:</h3>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Admin will review your application (1-2 days)</li>
                    <li>If approved, you'll pay KES 300 via M-Pesa</li>
                    <li>Your profile becomes visible to customers</li>
                    <li>Start getting contacted for jobs!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary flex-1"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help?{" "}
            <a
              href="mailto:support@homehelp.co.ke"
              className="text-blue-600 hover:underline"
            >
              support@homehelp.co.ke
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}