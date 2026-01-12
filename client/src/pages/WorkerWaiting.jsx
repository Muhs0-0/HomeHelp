import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function WorkerWaiting() {
  const navigate = useNavigate();

  useEffect(() => {
    // Optionally auto-redirect to dashboard after some time
    const t = setTimeout(() => {
      navigate('/worker/dashboard');
    }, 15000); // 15s

    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-8 max-w-xl w-full text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Received</h2>
        <p className="text-gray-700 mb-4">Thank you — your application has been submitted and is awaiting admin approval.</p>
        <p className="text-gray-600 mb-6">You will be notified when your application is reviewed. You will be automatically redirected to your dashboard shortly.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/worker/dashboard')} className="btn-primary">Go to Dashboard</button>
          <button onClick={() => navigate('/workers')} className="btn-secondary">Browse Workers</button>
        </div>
      </motion.div>
    </div>
  );
}
