import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Car, Bike, Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { vehiclesAPI, fromBackend } from '../../api/vehicles'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const VEHICLE_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'Car', label: 'Car' },
  { value: 'Bike', label: 'Bike' },
  { value: 'Scooty', label: 'Scooty' },
]

function VehicleForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Vehicle Type"
        required
        options={VEHICLE_TYPE_OPTIONS}
        error={errors.vehicleType?.message}
        {...register('vehicleType', { required: 'Vehicle type is required' })}
      />
      <Input
        label="Registration Number"
        required
        placeholder="e.g. MH12AB1234"
        error={errors.registrationNumber?.message}
        {...register('registrationNumber', { required: 'Registration number is required' })}
      />
      <Input
        label="Make"
        required
        placeholder="e.g. Maruti"
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
      <Input
        label="Color"
        placeholder="e.g. White"
        {...register('color')}
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Any additional notes..."
          {...register('notes')}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="submit" loading={loading}>Save Vehicle</Button>
      </div>
    </form>
  )
}

export default function MyVehiclesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [deleteVehicle, setDeleteVehicle] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      toast.error(err.message || 'Failed to add vehicle.')
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

  async function handleDelete() {
    setDeleting(true)
    try {
      await vehiclesAPI.deleteVehicle(deleteVehicle._id)
      toast.success('Vehicle deleted.')
      setDeleteVehicle(null)
      fetchVehicles()
    } catch (err) {
      toast.error(err.message || 'Failed to delete vehicle.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
          <p className="text-gray-500 mt-1">Manage your registered vehicles.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Vehicle
        </Button>
      </div>

      {loading ? (
        <Spinner message="Loading vehicles..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchVehicles}>Retry</Button>
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          subtitle="Add your first vehicle to start booking washes."
          action={<Button onClick={() => setAddOpen(true)}>Add Vehicle</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v._id} className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                {v.vehicleType === 'Bike' || v.vehicleType === 'Scooty' ? (
                  <Bike className="w-6 h-6 text-primary" />
                ) : (
                  <Car className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{v.registrationNumber}</p>
                <p className="text-sm text-gray-500">{v.make} {v.model}</p>
                {v.color && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: v.color.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-400">{v.color}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                  onClick={() => setEditVehicle(v)}
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  onClick={() => setDeleteVehicle(v)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Vehicle">
        <VehicleForm onSubmit={handleAdd} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title="Edit Vehicle">
        {editVehicle && (
          <VehicleForm
            defaultValues={editVehicle}
            onSubmit={handleEdit}
            loading={submitting}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        message={`Delete vehicle ${deleteVehicle?.registrationNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
