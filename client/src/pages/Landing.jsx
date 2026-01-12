import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Heart, CheckCircle, Users, Briefcase, DollarSign, Clock, Award, TrendingUp, Star } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              
              <div className="h-9 w-9 rounded-full overflow-hidden shadow-md bg-black">
                <img
                  src="/logo.png"
                  alt="HomeHelp"
                  className="h-full w-full object-cover"
                />
              </div>

              <span className="text-xl font-bold">
                <span className="text-primary">Home</span>
                <span className="text-secondary">Help</span>
              </span>
            </div>


            <div className="flex gap-4">
              <Link to="/login" className="px-4 py-2 text-primary hover:text-primary-700 font-medium">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dual Audience */}
      <section className="section-container text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Kenya's #1 Platform for<br />
            <span className="text-primary">Domestic Workers</span> &
            <span className="text-secondary"> Employers</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Workers: Get hired faster with verified profiles.
            Customers: Find trusted, vetted professionals for your home.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            {/* Worker CTA */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white max-w-md shadow-xl"
            >
              <Briefcase className="w-12 h-12 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-2">For Workers</h3>
              <p className="mb-6 text-blue-100">Get more clients & grow your income</p>
              <Link
                to="/register?role=worker"
                className="block w-full px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Join as Worker →
              </Link>
              <div className="mt-4 text-sm text-blue-100">
                ✓ Verified profile • ✓ Get hired faster • ✓ One-time KES 300
              </div>
            </motion.div>

            {/* Customer CTA */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white max-w-md shadow-xl"
            >
              <Users className="w-12 h-12 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-2">For Customers</h3>
              <p className="mb-6 text-green-100">Find trusted workers for your home</p>
              <Link
                to="/workers"
                className="block w-full px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                Browse Workers →
              </Link>
              <div className="mt-4 text-sm text-green-100">
                ✓ Browse free • ✓ Verified workers • ✓ KES 500 to unlock all
              </div>
            </motion.div>
          </div>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-4 gap-8">
            <TrustCard
              icon={<Shield className="w-8 h-8" />}
              title="Admin Verified"
              description="Every worker is vetted by our team"
            />
            <TrustCard
              icon={<CheckCircle className="w-8 h-8" />}
              title="100% Kenyan"
              description="Built specifically for Kenya"
            />
            <TrustCard
              icon={<Heart className="w-8 h-8" />}
              title="Secure Payments"
              description="Safe M-Pesa integration"
            />
            <TrustCard
              icon={<Star className="w-8 h-8" />}
              title="Top Rated"
              description="Highly rated professionals"
            />
          </div>
        </motion.div>
      </section>

      {/* How It Works - For Workers */}
      <section className="section-container bg-blue-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works for Workers</h2>
          <p className="text-gray-600">Get hired in 4 simple steps</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          <WorkerStep
            number="1"
            icon={<Briefcase className="w-8 h-8" />}
            title="Create Profile"
            description="Sign up and complete your application with skills & experience"
          />
          <WorkerStep
            number="2"
            icon={<CheckCircle className="w-8 h-8" />}
            title="Get Approved"
            description="Our admin team reviews and verifies your profile (1-2 days)"
          />
          <WorkerStep
            number="3"
            icon={<DollarSign className="w-8 h-8" />}
            title="Pay KES 300"
            description="One-time payment to activate your profile via M-Pesa"
          />
          <WorkerStep
            number="4"
            icon={<TrendingUp className="w-8 h-8" />}
            title="Get Hired!"
            description="Customers see your profile and contact you directly"
          />
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg p-6 inline-block shadow-md">
            <p className="text-2xl font-bold text-blue-600 mb-2">Why Workers Love HomeHelp</p>
            <div className="grid md:grid-cols-3 gap-6 mt-4 text-left">
              <Feature icon="💼" text="More job opportunities" />
              <Feature icon="⚡" text="Get hired faster" />
              <Feature icon="💰" text="Set your own rates" />
              <Feature icon="📱" text="Direct customer contact" />
              <Feature icon="✅" text="Verified badge" />
              <Feature icon="🎯" text="Professional profile" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - For Customers */}
      <section className="section-container bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works for Customers</h2>
          <p className="text-gray-600">Find your perfect worker in 3 easy steps</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <CustomerStep
            number="1"
            icon={<Users className="w-8 h-8" />}
            title="Browse Profiles"
            description="View verified worker profiles with skills, experience, and rates - completely FREE"
          />
          <CustomerStep
            number="2"
            icon={<DollarSign className="w-8 h-8" />}
            title="Unlock Contacts"
            description="Pay KES 500 once to unlock ALL worker phone numbers for 48 hours"
          />
          <CustomerStep
            number="3"
            icon={<CheckCircle className="w-8 h-8" />}
            title="Hire Directly"
            description="Call or text workers directly. No middleman. Negotiate your own terms."
          />
        </div>

        <div className="mt-12 text-center">
          <div className="bg-green-50 rounded-lg p-6 inline-block border-2 border-green-200">
            <p className="text-2xl font-bold text-green-600 mb-2">Why Customers Trust HomeHelp</p>
            <div className="grid md:grid-cols-3 gap-6 mt-4 text-left">
              <Feature icon="✅" text="Admin-verified workers" />
              <Feature icon="🔍" text="Browse for free" />
              <Feature icon="💵" text="Fair one-time fee" />
              <Feature icon="📞" text="Direct contact" />
              <Feature icon="⏱️" text="48-hour full access" />
              <Feature icon="🛡️" text="Safe & secure" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-container bg-gradient-to-r from-primary to-primary-700 text-white">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <StatCard number="500+" label="Active Workers" />
          <StatCard number="1000+" label="Happy Customers" />
          <StatCard number="95%" label="Satisfaction Rate" />
          <StatCard number="24/7" label="Support" />
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-container bg-gray-50">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What People Say</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Testimonial
            quote="I got 5 job interviews in my first week! HomeHelp changed my life."
            name="Mary K."
            role="Housekeeper, Nairobi"
            type="worker"
          />
          <Testimonial
            quote="Found an amazing nanny in 2 days. The verification process made me feel safe."
            name="James M."
            role="Customer, Westlands"
            type="customer"
          />
          <Testimonial
            quote="Best investment I made. I now have a steady flow of clients every month."
            name="Grace W."
            role="Nanny, Kilimani"
            type="worker"
          />
          <Testimonial
            quote="KES 500 to access all workers? Much better than agencies charging 10K!"
            name="Sarah N."
            role="Customer, Karen"
            type="customer"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-container text-center bg-gradient-to-b from-primary-50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">Join thousands of workers and customers on HomeHelp</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=worker" className="btn-primary text-lg px-8 py-4">
              I'm a Worker
            </Link>
            <Link to="/workers" className="btn-secondary text-lg px-8 py-4">
              I'm Looking to Hire
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">🏠 HomeHelp</h3>
            <p className="text-gray-400">Kenya's trusted marketplace for domestic workers</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Workers</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/register?role=worker" className="hover:text-white">Sign Up</Link></li>
              <li><Link to="/login" className="hover:text-white">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/workers" className="hover:text-white">Browse Workers</Link></li>
              <li><Link to="/register" className="hover:text-white">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <p>
                Need help?{" "}
                <a
                  href="mailto:support@homehelp.co.ke"
                  className="text-blue-600 hover:underline"
                >
                  support@homehelp.co.ke
                </a>
              </p>

              <li>Address: Nairobi, Kenya</li>
              <li>Phone: 0722743715</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; 2024 HomeHelp Kenya. All rights reserved. Made with ❤️ in Kenya</p>
        </div>
      </footer>
    </div>
  );
}

function TrustCard({ icon, title, description }) {
  return (
    <motion.div
      className="card p-6 text-center"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="text-primary mx-auto mb-4 flex justify-center">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}

function WorkerStep({ number, icon, title, description }) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Number(number) * 0.1 }}
    >
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
        {number}
      </div>
      <div className="text-blue-600 mx-auto mb-3 flex justify-center">{icon}</div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}

function CustomerStep({ number, icon, title, description }) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Number(number) * 0.1 }}
    >
      <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
        {number}
      </div>
      <div className="text-green-600 mx-auto mb-3 flex justify-center">{icon}</div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      <div className="text-4xl font-bold mb-2">{number}</div>
      <div className="text-primary-100">{label}</div>
    </motion.div>
  );
}

function Testimonial({ quote, name, role, type }) {
  return (
    <motion.div
      className={`card p-6 ${type === 'worker' ? 'border-l-4 border-blue-500' : 'border-l-4 border-green-500'}`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 ${type === 'worker' ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center text-2xl flex-shrink-0`}>
          {type === 'worker' ? '👩‍💼' : '🙋‍♂️'}
        </div>
        <div>
          <p className="text-gray-700 italic mb-4">"{quote}"</p>
          <div>
            <p className="font-semibold text-gray-900">{name}</p>
            <p className="text-sm text-gray-500">{role}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}