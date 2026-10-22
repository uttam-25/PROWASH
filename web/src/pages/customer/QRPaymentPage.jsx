import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Copy, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingsAPI } from '../../api/bookings'
import { paymentsAPI } from '../../api/payments'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const UPI_ID = 'mr.uttama@ptyes'
const ACCOUNT_NAME = 'Uttama Choori'
const BANK_NAME = 'State Bank of India (SBI)'

export default function QRPaymentPage() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrImageMissing, setQrImageMissing] = useState(false)
  const [canConfirm, setCanConfirm] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    async function fetchBooking() {
      setLoading(true)
      try {
        const res = await bookingsAPI.getBooking(bookingId)
        const b = res.data.data?.booking || res.data.data
        setBooking(b)
        if (['pending_verification', 'paid'].includes(b?.paymentStatus)) {
          setConfirmed(true)
          setCanConfirm(false)
        }
      } catch (err) {
        setError(err.message || 'Failed to load booking details.')
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) fetchBooking()
  }, [bookingId])

  // 10-second countdown before enabling confirm button
  useEffect(() => {
    if (!booking || confirmed) return
    if (['pending_verification', 'paid'].includes(booking?.paymentStatus)) return
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          setCanConfirm(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [booking, confirmed])

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`)
    }).catch(() => {
      toast.error('Copy failed. Please copy manually.')
    })
  }

  async function handleConfirmPayment() {
    const amount = booking?.priceAtBooking
    const ok = window.confirm(
      `Have you completed the UPI payment of ₹${amount} to ${UPI_ID}?`
    )
    if (!ok) return
    setConfirming(true)
    try {
      await paymentsAPI.confirmUPI(bookingId, '')
      setConfirmed(true)
      toast.success('Payment confirmation submitted!')
    } catch (err) {
      toast.error(err.message || 'Failed to submit payment confirmation.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return (
    <div className="p-6 flex justify-center">
      <Spinner message="Loading payment details..." />
    </div>
  )

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Link to="/dashboard/bookings"><Button variant="outline">Back to Bookings</Button></Link>
    </div>
  )

  const amount = booking?.priceAtBooking
  const bookingRef = booking?.bookingReference || bookingId
  const serviceName = booking?.serviceNameSnapshot || 'Wash Service'
  const paymentStatus = booking?.paymentStatus

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="card p-5 text-center">
        <h1 className="text-xl font-bold text-gray-900">PROWASH Payment</h1>
        <p className="text-sm text-gray-500 mt-1">{serviceName}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">Booking: {bookingRef}</p>
        <p className="text-3xl font-bold text-primary mt-3">₹{Number(amount).toLocaleString('en-IN')}</p>
        <div className="mt-2">
          <Badge status={paymentStatus} label={paymentStatus?.replace(/_/g, ' ').toUpperCase()} />
        </div>
      </div>

      {/* QR Code */}
      <div className="card p-5 flex flex-col items-center gap-4">
        {!qrImageMissing ? (
          <img
            src="/qr-payment.png"
            alt="UPI QR Code"
            className="w-56 h-56 object-contain rounded-lg border border-gray-200"
            onError={() => setQrImageMissing(true)}
          />
        ) : (
          <div className="w-56 h-56 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-lg bg-amber-50 p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-xs text-amber-700 font-medium">QR code image not configured.</p>
            <p className="text-xs text-amber-600 mt-1">Place your QR image at <code className="bg-amber-100 px-1 rounded">web/public/qr-payment.png</code></p>
          </div>
        )}
        <p className="text-sm text-gray-600 text-center">Scan the QR code using your preferred UPI app and complete the payment.</p>
      </div>

      {/* Payment Details */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Details</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">UPI ID</p>
            <p className="font-mono font-medium text-gray-800">{UPI_ID}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(UPI_ID, 'UPI ID')}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Amount</p>
            <p className="font-medium text-gray-800">₹{Number(amount).toLocaleString('en-IN')}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(String(amount), 'Amount')}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>

        <div>
          <p className="text-xs text-gray-400">Account Holder</p>
          <p className="font-medium text-gray-800">{ACCOUNT_NAME}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400">Bank</p>
          <p className="font-medium text-gray-800">{BANK_NAME}</p>
        </div>
      </div>

      {/* Confirmation */}
      <div className="card p-5 space-y-4">
        {confirmed || paymentStatus === 'pending_verification' || paymentStatus === 'paid' ? (
          <div className="text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-800">
              {paymentStatus === 'paid' ? 'Payment Verified!' : 'Payment Pending Verification'}
            </p>
            <p className="text-sm text-gray-500">
              {paymentStatus === 'paid'
                ? 'Your payment has been verified by our team.'
                : "Your payment is pending verification by our team. We'll confirm within 24 hours."}
            </p>
            <Link to="/dashboard/bookings">
              <Button variant="outline" className="mt-2">View My Bookings</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">After completing payment in your UPI app, click below to notify us.</p>
            </div>
            <Button
              className="w-full"
              size="lg"
              loading={confirming}
              disabled={!canConfirm || confirming}
              onClick={handleConfirmPayment}
            >
              {!canConfirm ? (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Please wait {countdown}s...
                </span>
              ) : (
                '✓ I Have Completed Payment'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
