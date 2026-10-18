import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CalendarCheck, Sparkles } from 'lucide-react'
import { servicesAPI } from '../api/services'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

const HOW_IT_WORKS = [
  { icon: Search, step: '01', title: 'Choose Service', desc: 'Browse our range of premium cleaning packages for your vehicle.' },
  { icon: CalendarCheck, step: '02', title: 'Book a Slot', desc: 'Pick a date and time that works best for you.' },
  { icon: Sparkles, step: '03', title: 'Enjoy the Shine', desc: 'Our professionals take care of the rest. Drive away gleaming.' },
]

export default function LandingPage() {
  const [services, setServices] = useState([])
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    servicesAPI.getServices()
      .then(res => {
        const list = res.data?.data?.services || res.data?.data || []
        setServices(list.slice(0, 6))
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="min-h-[80vh] flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg, #0B1B2B 0%, #147DAB 100%)' }}
      >
        <div className="text-center px-6 max-w-3xl mx-auto">
          <h1 className="text-6xl font-black tracking-wider mb-4 leading-tight">PROWASH</h1>
          <p className="text-2xl font-light mb-3 text-white/90">Premium Vehicle Cleaning &amp; Care</p>
          <p className="text-lg text-white/70 mb-10">Clean cars. Happy rides.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#0B1B2B] font-semibold rounded-xl text-lg hover:bg-white/90 transition-colors shadow-lg"
            >
              Book a Wash
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-semibold rounded-xl text-lg hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How It Works</h2>
          <p className="text-center text-gray-500 mb-14">Three simple steps to a sparkling clean vehicle</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#147DAB]/10 flex items-center justify-center mb-5">
                  <Icon className="w-8 h-8 text-[#147DAB]" />
                </div>
                <span className="text-xs font-bold text-[#147DAB] tracking-widest mb-2">STEP {step}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Our Services</h2>
          <p className="text-center text-gray-500 mb-14">Choose the package that fits your vehicle</p>

          {loadingServices ? (
            <Spinner message="Loading services..." />
          ) : services.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No services available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <div
                  key={service._id}
                  className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">{service.name}</h3>
                    {service.vehicleType && (
                      <Badge label={service.vehicleType} />
                    )}
                  </div>
                  {service.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-[#147DAB]">{formatPrice(service.price)}</span>
                    {service.duration && (
                      <span className="text-sm text-gray-400">{service.duration} min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0B1B2B] text-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
          <p className="text-white/70 mb-8">Join thousands of happy customers who trust PROWASH for their vehicle care.</p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-10 py-3 bg-[#147DAB] text-white font-semibold rounded-xl text-lg hover:bg-[#1290c5] transition-colors shadow-lg"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center">
        <p className="font-bold text-white text-xl tracking-wider mb-1">PROWASH</p>
        <p className="text-sm">© 2024 PROWASH. All rights reserved.</p>
      </footer>
    </div>
  )
}
