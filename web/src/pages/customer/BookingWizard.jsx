import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Car, Bike, Zap, ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { bookingsAPI } from '../../api/bookings'
import { vehiclesAPI, fromBackend } from '../../api/vehicles'
import { servicesAPI } from '../../api/services'
import { availabilityAPI } from '../../api/availability'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import VehicleRegistrationLookup from '../../components/VehicleRegistrationLookup'

const STEPS = ['Vehicle Type', 'Select Vehicle', 'Select Service', 'Date & Time', 'Review & Confirm']
const ADDRESS_FIELDS = [
  { name: 'houseNumber', label: 'House number / building name', placeholder: 'e.g. 12, Green View Apartments' },
  { name: 'street', label: 'Street / road', placeholder: 'Street or road' },
  { name: 'area', label: 'Area / locality', placeholder: 'Area or locality' },
  { name: 'city', label: 'City', placeholder: 'City' },
  { name: 'state', label: 'State', placeholder: 'State' },
  { name: 'pinCode', label: 'PIN code', placeholder: '6-digit PIN code' },
  { name: 'landmark', label: 'Landmark (optional)', placeholder: 'Nearby landmark' },
]

function formatServiceAddress(address) {
  return [
    address.houseNumber,
    address.street,
    address.area,
    address.landmark ? `Near ${address.landmark}` : '',
    address.city,
    address.state,
    address.pinCode,
  ].filter(Boolean).join(', ')
}

const VEHICLE_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'Car', label: 'Car' },
  { value: 'Bike', label: 'Bike' },
  { value: 'Scooty', label: 'Scooty' },
]

// Mini vehicle form used in the "Add New Vehicle" modal during step 2
// Uses registration lookup to auto-fill details
function AddVehicleForm({ onSubmit, loading, defaultVehicleType }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { vehicleType: defaultVehicleType || '' }
  })
  const [lookupData, setLookupData] = useState(null)
  const [lookupVerified, setLookupVerified] = useState(false)

  function handleLookupComplete(fields) {
    setLookupData(fields)
    setLookupVerified(true)
    if (fields.make) setValue('make', fields.make, { shouldValidate: true })
    if (fields.model) setValue('model', fields.model, { shouldValidate: true })
    if (fields.color) setValue('color', fields.color)
    if (fields.registrationNumber) setValue('registrationNumber', fields.registrationNumber, { shouldValidate: true })
    if (fields.suggestedCategory && !defaultVehicleType) {
      setValue('vehicleType', fields.suggestedCategory, { shouldValidate: true })
    }
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({ ...data, ...(lookupData || {}), lookupVerified })
      )}
      className="space-y-4"
    >
      {/* Registration lookup */}
      <div className="pb-3 border-b border-gray-100">
        <VehicleRegistrationLookup onLookupComplete={handleLookupComplete} />
      </div>

      <Select
        label="Vehicle Type"
        required
        options={VEHICLE_TYPE_OPTIONS}
        error={errors.vehicleType?.message}
        {...register('vehicleType', { required: 'Required' })}
      />

      <div className="relative">
        <Input
          label="Registration Number"
          required
          placeholder="e.g. MH12AB1234"
          className={`font-mono uppercase tracking-widest ${lookupVerified ? 'pr-8' : ''}`}
          error={errors.registrationNumber?.message}
          {...register('registrationNumber', { required: 'Required' })}
        />
        {lookupVerified && (
          <ShieldCheck className="absolute right-3 top-9 w-4 h-4 text-green-600" title="Verified" />
        )}
      </div>

      <Input
        label="Make"
        required
        error={errors.make?.message}
        {...register('make', { required: 'Required' })}
      />
      <Input
        label="Model"
        required
        error={errors.model?.message}
        {...register('model', { required: 'Required' })}
      />
      <Input label="Color" {...register('color')} />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Add Vehicle</Button>
      </div>
    </form>
  )
}

export default function BookingWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedServiceId = searchParams.get('serviceId')

  const [currentStep, setCurrentStep] = useState(1)
  const [vehicleType, setVehicleType] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [serviceAddress, setServiceAddress] = useState({
    houseNumber: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pinCode: '',
    landmark: '',
  })
  const [serviceLat, setServiceLat] = useState('')
  const [serviceLng, setServiceLng] = useState('')
  const [addressError, setAddressError] = useState('')
  const [locationMessage, setLocationMessage] = useState('')
  const [locationMessageType, setLocationMessageType] = useState('')
  const [locationSource, setLocationSource] = useState('manual')
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const confirmInFlightRef = useRef(false)
  const confirmRequestRef = useRef({ fingerprint: null, requestId: null })
  const [bookingResult, setBookingResult] = useState(null)
  const [liveStatus, setLiveStatus] = useState(null)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const socketRef = useRef(null)

  // Step 2 state
  const [vehicles, setVehicles] = useState([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehiclesError, setVehiclesError] = useState(null)
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [addingVehicle, setAddingVehicle] = useState(false)

  // Step 3 state
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState(null)

  // Step 4 state
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(null)

  // Step 5 reschedule date/slot (re-used from step 4)
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  async function fetchVehicles() {
    setVehiclesLoading(true)
    setVehiclesError(null)
    try {
      const res = await vehiclesAPI.getMyVehicles()
      const raw = res.data.data?.vehicles || res.data.data || []
      const list = Array.isArray(raw) ? raw.map(fromBackend) : []
      setVehicles(list)
      return list
    } catch {
      setVehiclesError('Failed to load vehicles.')
      return []
    } finally {
      setVehiclesLoading(false)
    }
  }

  async function fetchServices() {
    setServicesLoading(true)
    setServicesError(null)
    try {
      const params = vehicleType ? { vehicleType } : {}
      const res = await servicesAPI.getServices(params)
      const list = res.data.data?.services || res.data.data || []
      setServices(list)
      // Pre-select from URL param
      if (preselectedServiceId) {
        const match = list.find(s => s._id === preselectedServiceId)
        if (match) setSelectedService(match)
      }
    } catch {
      setServicesError('Failed to load services.')
    } finally {
      setServicesLoading(false)
    }
  }

  async function fetchSlots(date) {
    if (!selectedService || !date) return
    setSlotsLoading(true)
    setSlotsError(null)
    setSelectedSlot(null)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await availabilityAPI.getSlots(selectedService._id, dateStr)
      // Backend returns availableSlots (not slots)
      const raw = res.data.data?.availableSlots || res.data.data?.slots || []
      // Normalise: ensure every slot has an `available` flag for the UI
      setSlots(raw.map(s => ({ ...s, available: true })))
    } catch {
      setSlotsError('Failed to load available slots.')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function handleAddVehicle(data) {
    setAddingVehicle(true)
    try {
      await vehiclesAPI.addVehicle(data)
      toast.success('Vehicle added!')
      setAddVehicleOpen(false)
      await fetchVehicles()
    } catch (err) {
      // 409 = customer already has a vehicle registered
      if (err.message?.includes('already have')) {
        toast.error(
          'You already have a vehicle registered. Go to My Vehicle to update or replace it.',
          { duration: 6000 }
        )
        setAddVehicleOpen(false)
        await fetchVehicles()
      } else {
        toast.error(err.message || 'Failed to add vehicle.', { duration: 5000 })
      }
    } finally {
      setAddingVehicle(false)
    }
  }

  async function handleConfirm() {
    if (confirmInFlightRef.current) return
    if (!selectedVehicle?._id) {
      toast.error('Select a vehicle before confirming your booking.')
      return
    }
    if (!selectedService?._id) {
      toast.error('Select a valid service before confirming your booking.')
      return
    }
    if (!selectedSlot?.startAt || Number.isNaN(new Date(selectedSlot.startAt).getTime())) {
      toast.error('Select a valid booking date and time.')
      return
    }
    if (!paymentMethod) {
      toast.error('Select a payment method before confirming your booking.')
      return
    }
    const requiredAddressValues = [
      serviceAddress.houseNumber,
      serviceAddress.street,
      serviceAddress.area,
      serviceAddress.city,
      serviceAddress.state,
    ]
    if (requiredAddressValues.some(value => !value.trim())) {
      setAddressError('Enter the house/building, street, area, city and state.')
      return
    }
    if (!/^[1-9]\d{5}$/.test(serviceAddress.pinCode.trim())) {
      setAddressError('Enter a valid 6-digit PIN code.')
      return
    }
    const hasLat = serviceLat.trim() !== ''
    const hasLng = serviceLng.trim() !== ''
    const lat = hasLat ? Number(serviceLat) : NaN
    const lng = hasLng ? Number(serviceLng) : NaN
    if (locationSource === 'gps' &&
        (!hasLat || !hasLng || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
         !Number.isFinite(lng) || lng < -180 || lng > 180)) {
      setAddressError('The detected coordinates are invalid. Detect your location again or enter the address manually.')
      return
    }
    setAddressError('')
    const address = formatServiceAddress(serviceAddress)
    confirmInFlightRef.current = true
    setSubmitting(true)
    try {
      const requestData = {
        vehicleId: selectedVehicle._id,
        serviceId: selectedService._id,
        startAt: selectedSlot.startAt,
        paymentMethod,
        notes,
        customerLocation: {
          address,
          ...serviceAddress,
          ...(hasLat && hasLng ? { lat, lng } : {}),
          locationSource: hasLat && hasLng ? locationSource : 'manual',
        },
      }
      const fingerprint = JSON.stringify(requestData)
      if (confirmRequestRef.current.fingerprint !== fingerprint) {
        confirmRequestRef.current = {
          fingerprint,
          requestId: window.crypto.randomUUID(),
        }
      }
      const res = await bookingsAPI.createBooking(requestData, confirmRequestRef.current.requestId)
      const booking = res.data.data?.booking || res.data.data
      if (paymentMethod === 'upi' && booking._id) {
        navigate(`/dashboard/payment/${booking._id}`)
        return
      }
      setBookingResult(booking)
      setLiveStatus(booking.status)
      if (booking.locationMatchStatus === 'location_required') {
        toast.error('Your address was saved, but nearby partner assignment is waiting for a valid location.')
      }
      if (booking.partnerId && typeof booking.partnerId === 'object') {
        setPartnerInfo({ ...booking.partnerId, partnerDistanceKm: booking.partnerDistanceKm })
      }
    } catch (err) {
      toast.error(err.message || 'Booking failed. Please try again.')
    } finally {
      confirmInFlightRef.current = false
      setSubmitting(false)
    }
  }

  function useCurrentLocation() {
    setAddressError('')
    setLocationMessage('')
    setServiceLat('')
    setServiceLng('')
    setLocationSource('manual')
    if (!navigator.geolocation) {
      setLocationMessage('Your browser does not support location detection. Please enter your address manually.')
      setLocationMessageType('error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setServiceLat(String(coords.latitude))
        setServiceLng(String(coords.longitude))
        setLocationSource('gps')
        try {
          const response = await bookingsAPI.reverseGeocode({
            lat: coords.latitude,
            lng: coords.longitude,
          })
          const result = response.data.data
          const detectedAddress = result?.address || {}
          setServiceAddress(current => Object.fromEntries(
            ADDRESS_FIELDS.map(({ name }) => [
              name,
              detectedAddress[name]?.trim() ? detectedAddress[name] : current[name],
            ])
          ))
          setLocationMessage('Location detected. Review and complete any missing address fields.')
          setLocationMessageType('success')
        } catch {
          setLocationMessage('Location detected, but we could not retrieve the address. Please enter your address manually.')
          setLocationMessageType('error')
        } finally {
          setLocating(false)
        }
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please allow location access or enter your service address manually.',
          2: 'Unable to detect your current location. Please enter your service address manually.',
          3: 'Location request timed out. Please try again.',
        }
        setLocationMessage(messages[error.code] || 'Unable to detect your current location. Please enter your service address manually.')
        setLocationMessageType('error')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // Load data when entering relevant steps
  useEffect(() => {
    if (currentStep === 2) {
      fetchVehicles().then(list => {
        if (list.length === 1) {
          setSelectedVehicle(list[0])
          setCurrentStep(3)
        }
      })
    }
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 3) fetchServices()
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 4 && selectedDate) fetchSlots(selectedDate)
  }, [selectedDate])

  // Real-time booking status tracking via Socket.IO + polling fallback
  useEffect(() => {
    if (!bookingResult) return

    const bookingId = bookingResult._id

    // Socket connection
    import('socket.io-client').then(({ io }) => {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin
      const token = localStorage.getItem('prowash_token')
      const socket = io(apiUrl, { path: '/socket.io', transports: ['websocket', 'polling'], auth: { token } })
      socketRef.current = socket
      socket.emit('join:booking', { bookingId })
      socket.on('booking:assigned', (data) => {
        setLiveStatus('partner_assigned')
        if (data.partnerName) setPartnerInfo({ name: data.partnerName })
      })
      socket.on('booking:status_update', (data) => {
        setLiveStatus(data.status)
      })
    }).catch(() => {})

    // Polling fallback every 10 seconds
    const poll = setInterval(async () => {
      try {
        const res = await bookingsAPI.getBooking(bookingId)
        const b = res.data.data?.booking || res.data.data
        if (b?.status) setLiveStatus(b.status)
        // partnerId is populated server-side to { _id, name, phone }
        if (b?.partnerId && typeof b.partnerId === 'object') {
          setPartnerInfo({ ...b.partnerId, partnerDistanceKm: b.partnerDistanceKm })
        }
      } catch {}
    }, 10000)

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      clearInterval(poll)
    }
  }, [bookingResult])

  function goBack() {
    if (currentStep > 1) setCurrentStep(s => s - 1)
  }

  // ── Progress Bar ──────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center gap-0">
        {STEPS.map((label, idx) => {
          const step = idx + 1
          const done = step < currentStep
          const active = step === currentStep
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done ? 'bg-primary border-primary text-white'
                  : active ? 'bg-white border-primary text-primary'
                  : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : step}
                </div>
                <p className={`text-xs mt-1 hidden sm:block whitespace-nowrap ${active ? 'text-primary font-medium' : 'text-gray-400'}`}>{label}</p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${done ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Step 1: Vehicle Type ──────────────────────────────────────
  const Step1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">What type of vehicle?</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { type: 'Car', icon: Car, label: 'Car' },
          { type: 'Bike', icon: Bike, label: 'Bike' },
          { type: 'Scooty', icon: Zap, label: 'Scooty' },
        ].map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => { setVehicleType(type); setCurrentStep(2) }}
            className={`card p-6 flex flex-col items-center gap-3 hover:border-primary hover:shadow-md transition-all border-2 ${
              vehicleType === type ? 'border-primary bg-blue-50' : 'border-transparent'
            }`}
          >
            <Icon className="w-12 h-12 text-primary" />
            <span className="font-semibold text-gray-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Step 2: Select Vehicle ────────────────────────────────────
  const filteredVehicles = vehicles.filter(v =>
    !vehicleType || v.vehicleType === vehicleType
  )

  const Step2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Select your vehicle</h2>
      {vehiclesLoading ? (
        <Spinner message="Loading vehicles..." />
      ) : vehiclesError ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{vehiclesError}</p>
          <Button onClick={fetchVehicles}>Retry</Button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          subtitle={`Add a ${vehicleType || 'vehicle'} to continue.`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredVehicles.map(v => (
            <button
              key={v._id}
              onClick={() => { setSelectedVehicle(v); setCurrentStep(3) }}
              className={`card p-4 flex items-center gap-4 text-left hover:border-primary transition-all border-2 ${
                selectedVehicle?._id === v._id ? 'border-primary bg-blue-50' : 'border-transparent'
              }`}
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                {v.vehicleType === 'Bike' || v.vehicleType === 'Scooty' ? (
                  <Bike className="w-5 h-5 text-primary" />
                ) : (
                  <Car className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-bold text-gray-800">{v.registrationNumber}</p>
                <p className="text-sm text-gray-500">{v.make} {v.model}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <Button variant="outline" onClick={() => setAddVehicleOpen(true)}>
        Register Your Vehicle
      </Button>

      <Modal isOpen={addVehicleOpen} onClose={() => setAddVehicleOpen(false)} title="Add New Vehicle" size="lg">
        <AddVehicleForm onSubmit={handleAddVehicle} loading={addingVehicle} defaultVehicleType={vehicleType} />
      </Modal>
    </div>
  )

  // ── Step 3: Select Service ────────────────────────────────────
  const Step3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Choose a service</h2>
      {servicesLoading ? (
        <Spinner message="Loading services..." />
      ) : servicesError ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{servicesError}</p>
          <Button onClick={fetchServices}>Retry</Button>
        </div>
      ) : services.length === 0 ? (
        <EmptyState icon={Zap} title="No services available" subtitle="Check back soon." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {services.map(s => (
            <button
              key={s._id}
              onClick={() => setSelectedService(s)}
              className={`card p-4 text-left hover:border-primary transition-all border-2 ${
                selectedService?._id === s._id ? 'border-primary bg-blue-50' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-800">{s.name}</p>
                {selectedService?._id === s._id && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{s.category}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-lg font-bold text-primary">₹{s.price?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400">{s.duration} min</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button disabled={!selectedService} onClick={() => setCurrentStep(4)}>Next</Button>
      </div>
    </div>
  )

  // ── Step 4: Date & Time ───────────────────────────────────────
  const Step4 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Pick a date & time</h2>
      {/* Date chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {next14Days.map(day => {
          const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 flex-shrink-0 transition-all ${
                isSelected ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-primary text-gray-700'
              }`}
            >
              <span className="text-xs font-medium">{format(day, 'EEE')}</span>
              <span className="text-lg font-bold">{format(day, 'dd')}</span>
              <span className="text-xs">{format(day, 'MMM')}</span>
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Times</h3>
          {slotsLoading ? (
            <Spinner message="Loading slots..." />
          ) : slotsError ? (
            <div className="text-center py-6">
              <p className="text-red-600 mb-2">{slotsError}</p>
              <Button size="sm" onClick={() => fetchSlots(selectedDate)}>Retry</Button>
            </div>
          ) : slots.length === 0 ? (
            <EmptyState icon={Car} title="No slots available" subtitle="Try a different date." />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {slots.map(slot => {
                const isSelected = selectedSlot?.startAt === slot.startAt
                return (
                  <button
                    key={slot.startAt}
                    onClick={() => setSelectedSlot(slot)}
                    disabled={!slot.available}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      !slot.available ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                      : isSelected ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 hover:border-primary text-gray-700'
                    }`}
                  >
                    {format(parseISO(slot.startAt), 'hh:mm a')}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={!selectedSlot} onClick={() => setCurrentStep(5)}>Next</Button>
      </div>
    </div>
  )

  // ── Step 5: Review & Confirm ──────────────────────────────────
  const STATUS_LABELS = {
    pending:           '⏳ Booking Pending',
    searching_partner: '🔍 Searching for a Cleaning Partner...',
    partner_assigned:  '✅ Partner Assigned',
    partner_accepted:  '🤝 Partner Accepted',
    partner_on_way:    '🚗 Partner is on the Way',
    partner_arrived:   '📍 Partner Arrived',
    in_progress:       '🧼 Cleaning in Progress',
    completed:         '✨ Service Completed!',
    confirmed:         '✅ Booking Confirmed',
    cancelled:         '❌ Booking Cancelled',
  }

  const Step5 = () => {
    if (bookingResult) {
      const displayStatus = liveStatus || bookingResult.status
      const isSearching = ['pending', 'searching_partner'].includes(displayStatus)
      const locationRequired = bookingResult.locationMatchStatus === 'location_required'

      return (
        <div className="text-center py-10 space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {locationRequired ? 'Booking Request Received' : 'Booking Confirmed!'}
          </h2>
          <p className="text-gray-500">
            Your booking reference is{' '}
            <span className="font-bold text-gray-800 font-mono">
              {bookingResult.bookingReference || bookingResult._id}
            </span>
          </p>
          {bookingResult.customerLocation?.address && (
            <div className="card p-4 mx-auto max-w-lg text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Service Address</p>
              <p className="text-sm text-gray-800">{bookingResult.customerLocation.address}</p>
            </div>
          )}
          {locationRequired && (
            <p className="mx-auto max-w-lg rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Your address was saved, but we could not determine its coordinates. Nearby partner assignment cannot proceed until a valid location is available.
            </p>
          )}

          {/* Live status card */}
          <div className={`card p-5 mx-auto max-w-sm border-2 ${
            displayStatus === 'completed' ? 'border-green-400 bg-green-50' : 'border-[#147DAB]/30 bg-[#147DAB]/5'
          }`}>
            <div className="flex items-center justify-center gap-3">
              {isSearching && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#147DAB] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#147DAB]" />
                </span>
              )}
              <p className="font-semibold text-gray-800">
                {STATUS_LABELS[displayStatus] || displayStatus?.replace(/_/g, ' ')}
              </p>
            </div>
            {partnerInfo?.name && (
              <p className="text-sm text-gray-500 mt-2">
                Partner: <span className="font-medium text-gray-700">{partnerInfo.name}</span>
                {partnerInfo.phone && <span> · {partnerInfo.phone}</span>}
              </p>
            )}
            {partnerInfo?.partnerDistanceKm != null && (
              <p className="text-sm text-gray-500 mt-1">
                {Number(partnerInfo.partnerDistanceKm).toFixed(2)} km away
              </p>
            )}
            {isSearching && (
              <p className="text-sm text-gray-500 mt-2">
                {locationRequired
                  ? 'Nearby partner search is waiting for valid coordinates for this address.'
                  : 'No nearby online partner is available right now. Your booking is pending. We will assign a partner when one becomes available.'}
              </p>
            )}
          </div>

          <Link to="/dashboard/bookings">
            <Button className="mt-4">View My Bookings</Button>
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Review & Confirm</h2>

        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Vehicle</p>
              <p className="font-semibold text-gray-800">{selectedVehicle?.registrationNumber}</p>
              <p className="text-sm text-gray-500">{selectedVehicle?.make} {selectedVehicle?.model}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Service</p>
              <p className="font-semibold text-gray-800">{selectedService?.name}</p>
              <p className="text-sm text-gray-500">
                {selectedService?.duration} min · ₹{selectedService?.price?.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Date & Time</p>
              {selectedSlot && (
                <>
                  <p className="font-semibold text-gray-800">
                    {format(parseISO(selectedSlot.startAt), 'EEEE, dd MMMM yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(selectedSlot.startAt), 'hh:mm a')}
                  </p>
                </>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Service Address</p>
              <p className="text-sm text-gray-800">{formatServiceAddress(serviceAddress) || 'Enter your service address below'}</p>
            </div>
          </div>
        </div>

        {/* Customer Address for partner to reach */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Service Address <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ADDRESS_FIELDS.map(({ name, label, placeholder }) => (
              <label key={name} className={`block text-sm font-medium text-gray-700 ${name === 'landmark' ? 'sm:col-span-2' : ''}`}>
                {label}{name !== 'landmark' && <span className="text-red-500"> *</span>}
                <input
                  type="text"
                  className="input mt-1"
                  placeholder={placeholder}
                  value={serviceAddress[name]}
                  required={name !== 'landmark'}
                  maxLength={name === 'pinCode' ? 6 : 120}
                  inputMode={name === 'pinCode' ? 'numeric' : 'text'}
                  disabled={locating}
                  onChange={event => {
                    setServiceAddress(current => ({ ...current, [name]: event.target.value }))
                    setServiceLat('')
                    setServiceLng('')
                    setLocationSource('manual')
                    setLocationMessage('')
                    setAddressError('')
                  }}
                />
              </label>
            ))}
          </div>
          {locationMessage && (
            <p className={`text-sm ${locationMessageType === 'success' ? 'text-green-700' : 'text-red-600'}`} role="status">
              {locationMessage}
            </p>
          )}
          {addressError && (
            <p className="text-sm text-red-600" role="alert">{addressError}</p>
          )}
          <Button type="button" variant="outline" size="sm" loading={locating} disabled={locating} onClick={useCurrentLocation}>
            {locating ? 'Detecting location…' : locationMessageType === 'error' ? 'Retry location detection' : 'Use my current location'}
          </Button>
          <p className="text-xs text-gray-400">
            We use your permission-based location or geocode your entered address to find an online partner within 2 km. If location lookup is unavailable, your address can still be saved but nearby assignment will wait for valid coordinates.
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>          <textarea
            className="input"
            rows={3}
            placeholder="Any special instructions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Payment Method</p>
          <div className="flex gap-3">
            {[
              { value: 'cod', label: 'Cash on Delivery' },
              { value: 'upi', label: 'UPI / QR Code' },
              { value: 'online', label: 'Online Payment' },
            ].map(pm => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  paymentMethod === pm.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 hover:border-primary text-gray-700'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
          {paymentMethod === 'upi' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
              You'll be shown a QR code to scan after confirming your booking.
            </p>
          )}
        </div>

        <Button
          className="w-full"
          size="lg"
          loading={submitting}
          disabled={!paymentMethod || submitting || locating}
          onClick={handleConfirm}
        >
          Confirm Booking
        </Button>
      </div>
    )
  }

  const stepComponents = [Step1, Step2, Step3, Step4, Step5]
  const CurrentStepComponent = stepComponents[currentStep - 1]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Book a Wash</h1>
        <p className="text-gray-500 mt-1">Follow the steps to schedule your vehicle wash.</p>
      </div>

      <ProgressBar />

      {currentStep > 1 && !bookingResult && (
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <CurrentStepComponent />
    </div>
  )
}
