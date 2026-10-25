/**
 * VehicleRegistrationLookup
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable component that:
 *  1. Accepts an Indian vehicle registration number.
 *  2. Calls POST /api/vehicles/lookup via the backend (no API key in frontend).
 *  3. Displays the returned vehicle details card.
 *  4. Calls onLookupComplete({ ...fields }) so the parent form can pre-fill.
 *  5. Falls back to manual entry cleanly when the provider is unconfigured
 *     or the lookup returns no result.
 *
 * Props:
 *   onLookupComplete(fields)  — called after a successful lookup with vehicle fields
 *   onManualEntry()           — called when user clicks "Enter Manually"
 *   initialValue              — pre-fill the registration number input
 */

import { useState, useRef } from 'react'
import { Search, CheckCircle, AlertCircle, RefreshCw, Info } from 'lucide-react'
import { vehiclesAPI } from '../api/vehicles'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

// Indian reg number pattern: must be valid before we hit the server
const REG_PATTERN_STANDARD = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/
const REG_PATTERN_BH = /^\d{2}BH\d{4}[A-Z]{2}$/

function isValidReg(val) {
  const v = val.replace(/\s+/g, '').toUpperCase()
  return REG_PATTERN_STANDARD.test(v) || REG_PATTERN_BH.test(v)
}

function normalise(val) {
  return val.replace(/\s+/g, '').toUpperCase()
}

// Friendly label map for display
const FIELD_LABELS = {
  maker: 'Manufacturer',
  model: 'Model',
  variant: 'Variant',
  vehicleClass: 'Vehicle Class',
  fuelType: 'Fuel Type',
  color: 'Colour',
  registrationDate: 'Registration Date',
  registrationState: 'Registration State',
  rtoCode: 'RTO Code',
  rtoName: 'RTO Name',
  manufacturingYear: 'Manufacturing Year',
  emissionNorm: 'Emission Standard',
}

function VehicleDetailsCard({ vehicle, regNumber }) {
  const rows = Object.entries(FIELD_LABELS)
    .filter(([key]) => vehicle[key])
    .map(([key, label]) => ({ label, value: vehicle[key] }))

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="font-semibold text-green-800 text-sm">Vehicle Details Retrieved</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="col-span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Registration</p>
          <p className="font-bold text-gray-800 font-mono">{regNumber}</p>
        </div>
        {rows.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>
      {vehicle.prowashCategory && (
        <div className="mt-1 pt-3 border-t border-green-200">
          <p className="text-xs text-gray-500">Detected Vehicle Category</p>
          <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-white">
            {vehicle.prowashCategory}
          </span>
          {!vehicle.prowashCategory && (
            <p className="text-xs text-amber-700 mt-1">
              Category could not be determined automatically — please select manually.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function VehicleRegistrationLookup({
  onLookupComplete,
  onManualEntry,
  initialValue = '',
}) {
  const [regInput, setRegInput] = useState(initialValue)
  const [inputError, setInputError] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | found | not_found | not_configured | error
  const [lookupResult, setLookupResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const debounceRef = useRef(null)

  function handleChange(e) {
    const raw = e.target.value
    setRegInput(raw)
    setInputError('')
    // Clear previous result when user types again
    if (status !== 'idle') {
      setStatus('idle')
      setLookupResult(null)
    }
  }

  async function handleLookup() {
    const val = normalise(regInput)
    if (!val) {
      setInputError('Please enter a registration number.')
      return
    }
    if (!isValidReg(val)) {
      setInputError(
        'Invalid format. Use standard format e.g. MH12AB1234 or BH series e.g. 22BH1234AB.'
      )
      return
    }
    setInputError('')
    setStatus('loading')
    setLookupResult(null)
    setErrorMsg('')

    try {
      const res = await vehiclesAPI.lookupByReg(val)
      const data = res.data.data // { status, regNumber, vehicle, message }

      setLookupResult(data)

      if (data.status === 'found' && data.vehicle) {
        setStatus('found')
        // Notify parent with pre-filled fields
        onLookupComplete?.({
          registrationNumber: data.regNumber,
          make: data.vehicle.maker || '',
          model: data.vehicle.model || '',
          variant: data.vehicle.variant || '',
          vehicleClass: data.vehicle.vehicleClass || '',
          fuelType: data.vehicle.fuelType || '',
          color: data.vehicle.color || '',
          registrationDate: data.vehicle.registrationDate || '',
          registrationState: data.vehicle.registrationState || '',
          rtoCode: data.vehicle.rtoCode || '',
          rtoName: data.vehicle.rtoName || '',
          manufacturingYear: data.vehicle.manufacturingYear || '',
          emissionNorm: data.vehicle.emissionNorm || '',
          // Suggested category for the parent to apply if appropriate
          suggestedCategory: data.vehicle.prowashCategory || null,
          lookupProvider: 'rapidapi',
          lookupAt: new Date().toISOString(),
          lookupVerified: true,
        })
      } else if (data.status === 'not_configured') {
        setStatus('not_configured')
      } else {
        setStatus('not_found')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Lookup failed. Please try again or enter details manually.')
    }
  }

  // Allow Enter key to trigger lookup
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    }
  }

  return (
    <div className="space-y-4">
      {/* Registration input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Vehicle Registration Number <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={regInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. MH12AB1234"
            maxLength={12}
            className={`input flex-1 font-mono uppercase tracking-widest ${
              inputError ? 'border-red-400 focus:ring-red-400' : ''
            }`}
            disabled={status === 'loading'}
          />
          <Button
            onClick={handleLookup}
            loading={status === 'loading'}
            disabled={status === 'loading' || !regInput.trim()}
            className="flex-shrink-0"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Lookup</span>
          </Button>
        </div>
        {inputError && (
          <p className="text-red-500 text-xs mt-1">{inputError}</p>
        )}
        <p className="text-xs text-gray-400">
          Enter your registration number and click Lookup to auto-fill vehicle details.
        </p>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Fetching vehicle information…
        </div>
      )}

      {/* Found — show vehicle details card */}
      {status === 'found' && lookupResult?.vehicle && (
        <VehicleDetailsCard
          vehicle={lookupResult.vehicle}
          regNumber={lookupResult.regNumber}
        />
      )}

      {/* Not found */}
      {status === 'not_found' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Vehicle details not found
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lookupResult?.message ||
                "We couldn't retrieve details for this registration number. " +
                'Please enter the vehicle information manually below.'}
            </p>
          </div>
        </div>
      )}

      {/* Provider not configured — dev/testing mode */}
      {status === 'not_configured' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Automatic lookup not configured
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Set <code className="font-mono bg-blue-100 px-1 rounded">VEHICLE_LOOKUP_PROVIDER</code>{' '}
              and <code className="font-mono bg-blue-100 px-1 rounded">VEHICLE_LOOKUP_API_KEY</code>{' '}
              in <code className="font-mono bg-blue-100 px-1 rounded">server/.env</code> to enable live lookup.
              Please enter vehicle details manually below.
            </p>
          </div>
        </div>
      )}

      {/* API error */}
      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{errorMsg}</p>
          </div>
          <button
            onClick={handleLookup}
            className="text-xs text-red-700 underline flex items-center gap-1 hover:text-red-900"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
