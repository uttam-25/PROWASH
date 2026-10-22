import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Car, Bike, Pencil, Plus, ShieldCheck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { vehiclesAPI, fromBackend } from '../../api/vehicles'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import VehicleRegistrationLookup from '../../components/VehicleRegistrationLookup'

const VEHICLE_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'Car', label: 'Car' },
  { value: 'Bike', label: 'Bike' },
  { value: 'Scooty', label: 'Scooty' },
]

// ─── Smart vehicle form with registration lookup ─────────────────────────────
function VehicleForm({ defaultValues, onSubmit, loading, isEdit = false }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: defaultValues || {} })

  // Hidden fields populated from lookup
  const [lookupData, setLookupData] = useState(null)
  const [lookupVerified, setLookupVerified] = useState(false)

  function handleLookupComplete(fields) {
    setLookupData(fields)
    setLookupVerified(true)
    // Pre-fill form fields from lookup
    if (fields.make) setValue('make', fields.make, { shouldValidate: true })
    if (fields.model) setValue('model', fields.model, { shouldValidate: true })
    if (fields.color) setValue('color', fields.color)
    if (fields.registrationNumber) setValue('registrationNumber', fields.registrationNumber)
    // Suggest vehicle type from lookup category
    if (fields.suggestedCategory) {
      setValue('vehicleType', fields.suggestedCategory, { shouldValidate: true })
    }
  }

  return (
    <form
      onSubmit={handleSubmit((data) => {
        // Merge lookup provenance fields into submitted data
        const merged = {
          ...data,
          ...(lookupData || {}),
          lookupVerified,
        }
        onSubmit(merged)
      })}
      className="space-y-5"
    >
      {/* Registration lookup — only shown for new vehicles */}
      {!isEdit && (
        <div className="pb-4 border-b border-gray-100">
          <VehicleRegistrationLookup
            initialValue={watch('registrationNumber') || ''}
            onLookupComplete={handleLookupComplete}
          />
        </div>
      )}

      {/* Vehicle type */}
      <Select
        label="Vehicle Type"
        required
        options={VEHICLE_TYPE_OPTIONS}
        error={errors.vehicleType?.message}
        {...register('vehicleType', { required: 'Vehicle type is required' })}
      />

      {/* Registration number — editable but shows verified badge if lookup succeeded */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Registration Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. MH12AB1234"
            className={`input font-mono uppercase tracking-widest ${
              errors.registrationNumber ? 'border-red-400' : ''
            } ${lookupVerified ? 'pr-10' : ''}`}
            {...register('registrationNumber', {
              required: 'Registration number is required',
            })}
          />
          {lookupVerified && (
            <ShieldCheck
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600"
              title="Verified via registration lookup"
            />
          )}
        </div>
        {errors.registrationNumber && (
          <p className="text-red-500 text-xs">{errors.registrationNumber.message}</p>
        )}
        {lookupVerified && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Auto-filled from registration lookup
          </p>
        )}
      </div>

      <Input
        label="Make / Brand"
        required
        placeholder="e.g. Maruti Suzuki"
        error={errors.make?.message}
        {...register('make', { required: 'Make is required' })}
      />

      <Input
        label="Model"
        required
        placeholder="e.g. Swift"
        error={errors.model?.message}
        {...register('model', { required: 'Model is required' })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Colour"
          placeholder="e.g. White"
          {...register('color')}
        />
        <Input
          label="Year"
          type="number"
          placeholder="e.g. 2022"
          {...register('year', {
            min: { value: 1980, message: 'Year must be 1980 or later' },
            max: { value: new Date().getFullYear() + 1, message: 'Year is too far in the future' },
          })}
          error={errors.year?.message}
        />
      </div>

      {/* Show extra lookup details read-only if verified */}
      {lookupVerified && lookupData && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1 text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-2">Additional details from lookup</p>
          {lookupData.vehicleClass && <p>Class: {lookupData.vehicleClass}</p>}
          {lookupData.fuelType && <p>Fuel: {lookupData.fuelType}</p>}
          {lookupData.registrationState && <p>State: {lookupData.registrationState}</p>}
          {lookupData.rtoCode && <p>RTO: {lookupData.rtoCode}{lookupData.rtoName ? ` — ${lookupData.rtoName}` : ''}</p>}
          {lookupData.registrationDate && <p>Reg. Date: {lookupData.registrationDate}</p>}
          {lookupData.manufacturingYear && <p>Mfg. Year: {lookupData.manufacturingYear}</p>}
          {lookupData.emissionNorm && <p>Emission: {lookupData.emissionNorm}</p>}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Any additional notes…"
          {...register('notes')}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MyVehiclesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const [replaceFormOpen, setReplaceFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Derive single active vehicle
  const myVehicle = vehicles.find(v => v.isActive !== false) || vehicles[0] || null

  async function fetchVehicles() {
    setLoading(true)
    setError(null)
    try {
      const res = await vehiclesAPI.getMyVehicles()
      const raw = res.data.data?.vehicles || res.data.data || []
      setVehicles(Array.isArray(raw) ? raw.map(fromBackend) : [])
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVehicles() }, [])

  async function handleAdd(data) {
    setSubmitting(true)
    try {
      await vehiclesAPI.addVehicle(data)
      toast.success('Vehicle added successfully!')
      setAddOpen(false)
      fetchVehicles()
    } catch (err) {
      if (err.response?.status === 409 || err.message?.includes('already have')) {
        toast.error('You already have a vehicle registered.')
        fetchVehicles()
      } else {
        toast.error(err.message || 'Failed to add vehicle.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(data) {
    setSubmitting(true)
    try {
      await vehiclesAPI.updateVehicle(editVehicle._id, data)
      toast.success('Vehicle updated successfully!')
      setEditVehicle(null)
      fetchVehicles()
    } catch (err) {
      toast.error(err.message || 'Failed to update vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReplace(data) {
    setSubmitting(true)
    try {
      await vehiclesAPI.replaceVehicle(data)
      toast.success('Vehicle replaced successfully!')
      setReplaceFormOpen(false)
      fetchVehicles()
    } catch (err) {
      toast.error(err.message || 'Failed to replace vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasExtraDetails = myVehicle && (
    myVehicle.vehicleClass || myVehicle.rtoCode || myVehicle.registrationDate ||
    myVehicle.manufacturingYear || myVehicle.emissionNorm || myVehicle.registrationState
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Vehicle</h1>
          <p className="text-gray-500 mt-1">Your registered vehicle.</p>
        </div>
        {!myVehicle && !loading && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Register Vehicle
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner message="Loading vehicle…" />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchVehicles}>Retry</Button>
        </div>
      ) : !myVehicle ? (
        <EmptyState
          icon={Car}
          title="No vehicle registered"
          subtitle="Register your vehicle to start booking washes."
          action={<Button onClick={() => setAddOpen(true)}>Register Your Vehicle</Button>}
        />
      ) : (
        <div className="card p-6 space-y-5 max-w-lg">
          {/* Vehicle header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              {myVehicle.vehicleType === 'Bike' || myVehicle.vehicleType === 'Scooty' ? (
                <Bike className="w-7 h-7 text-primary" />
              ) : (
                <Car className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 font-mono text-lg">{myVehicle.registrationNumber}</p>
                {myVehicle.lookupVerified && (
                  <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" title="Verified via registration lookup" />
                )}
              </div>
              <p className="text-gray-600">{myVehicle.make} {myVehicle.model}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {myVehicle.vehicleType && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {myVehicle.vehicleType}
                  </span>
                )}
                {myVehicle.fuelType && (
                  <span className="text-xs text-gray-500">{myVehicle.fuelType}</span>
                )}
                {myVehicle.year && (
                  <span className="text-xs text-gray-500">{myVehicle.year}</span>
                )}
                {myVehicle.color && (
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: myVehicle.color.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-500">{myVehicle.color}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extra lookup details */}
          {hasExtraDetails && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              {myVehicle.vehicleClass && <p><span className="text-gray-400">Class:</span> {myVehicle.vehicleClass}</p>}
              {myVehicle.registrationState && <p><span className="text-gray-400">State:</span> {myVehicle.registrationState}</p>}
              {myVehicle.rtoCode && <p><span className="text-gray-400">RTO:</span> {myVehicle.rtoCode}{myVehicle.rtoName ? ` — ${myVehicle.rtoName}` : ''}</p>}
              {myVehicle.registrationDate && <p><span className="text-gray-400">Reg. Date:</span> {myVehicle.registrationDate}</p>}
              {myVehicle.manufacturingYear && <p><span className="text-gray-400">Mfg. Year:</span> {myVehicle.manufacturingYear}</p>}
              {myVehicle.emissionNorm && <p><span className="text-gray-400">Emission:</span> {myVehicle.emissionNorm}</p>}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditVehicle(myVehicle)}>
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setReplaceConfirmOpen(true)}>
              <RefreshCw className="w-4 h-4" />
              Replace Vehicle
            </Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Register Vehicle" size="lg">
        <VehicleForm onSubmit={handleAdd} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title="Edit Vehicle" size="lg">
        {editVehicle && (
          <VehicleForm
            defaultValues={editVehicle}
            onSubmit={handleEdit}
            loading={submitting}
            isEdit
          />
        )}
      </Modal>

      {/* Replace Confirm Dialog */}
      <ConfirmDialog
        isOpen={replaceConfirmOpen}
        onClose={() => setReplaceConfirmOpen(false)}
        onConfirm={() => { setReplaceConfirmOpen(false); setReplaceFormOpen(true) }}
        title="Replace Vehicle"
        message={`This will remove your current vehicle registration (${myVehicle?.registrationNumber || myVehicle?.licensePlate}) and register a new one. Continue?`}
        confirmLabel="Replace"
      />

      {/* Replace Form Modal */}
      <Modal isOpen={replaceFormOpen} onClose={() => setReplaceFormOpen(false)} title="Register New Vehicle" size="lg">
        <VehicleForm onSubmit={handleReplace} loading={submitting} />
      </Modal>
    </div>
  )
}
