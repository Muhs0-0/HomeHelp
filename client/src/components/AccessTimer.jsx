import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccessTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const time = calculateTimeLeft(expiresAt);
      setTimeLeft(time);
      
      if (time.total <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  function calculateTimeLeft(expiryDate) {
    const now = new Date().getTime();
    const expiry = new Date(expiryDate).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return {
        total: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    return {
      total: difference,
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  if (isExpired || timeLeft.total <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-2 flex items-center gap-2"
      >
        <AlertCircle className="w-5 h-5 text-red-600" />
        <span className="text-red-700 font-semibold">Access Expired</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg"
    >
      <Clock className="w-5 h-5" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Access expires in:</span>
        <div className="flex items-center gap-1 font-bold">
          <TimeUnit value={timeLeft.hours} label="h" />
          <span>:</span>
          <TimeUnit value={timeLeft.minutes} label="m" />
          <span>:</span>
          <TimeUnit value={timeLeft.seconds} label="s" />
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <motion.div
      key={value}
      initial={{ scale: 1.2, y: -5 }}
      animate={{ scale: 1, y: 0 }}
      className="bg-white bg-opacity-20 rounded px-2 py-1 min-w-[2.5rem] text-center"
    >
      {String(value).padStart(2, '0')}
      <span className="text-xs ml-1">{label}</span>
    </motion.div>
  );
}
