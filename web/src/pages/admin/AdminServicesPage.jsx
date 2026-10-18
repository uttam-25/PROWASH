import { useState, useEffect } from 'react'
import { Pencil, Trash2, Plus, Layers } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'

const VEHICLE_TYPE_OPTIONS = [
  { value: 'Car', label: 'Car' },
  { value: 'Bike', label: 'Bike' },
  { value: 'Scooty', label: 'Scooty' },
  { value: 'All', label: 'All' },
]

const CATEGORY_OPTIONS = [
  { value: 'Exterior Wash', label: 'Exterior Wash' },
  { value: 'Interior Cleaning', label: 'Interior Cleaning' },
  { value: 'Interior + Exterior', label: 'Interior + Exterior' },
  { value: 'Premium Detailing', label: 'Premium Detailing' },
  { value: 'Deep Cleaning', label: 'Deep Cleaning' },
  { value: 'Add-on', label: 'Add-on' },
]

function ServiceForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || {
      name: '', description: '', vehicleType: 'Car', category: 'Exterior Wash',
      price: '', durationMinutes: '', active: true,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
        <input className={`input w-full ${errors.name ? 'border-red-400' : ''}`} {...register('name', { required: 'Name is required' })} />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea className="input w-full resize-none" rows={3} {...register('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Vehicle Type <span className="text-red-500">*</span></label>
          <select className="input w-full" {...register('vehicleType', { required: true })}>
            {VEHICLE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
          <select className="input w-full" {...register('category', { required: true })}>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Price (₹) <span className="text-red-500">*</span></label>
          <input
            type="number" min="0"
            className={`input w-full ${errors.price ? 'border-red-400' : ''}`}
            {...register('price', { required: 'Price is required', min: { value: 0, message: 'Must be ≥ 0' }, valueAsNumber: true })}
          />
          {errors.price && <p className="text-red-500 text-xs">{errors.price.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Duration (min) <span className="text-red-500">*</span></label>
          <input
            type="number" min="1"
            className={`input w-full ${errors.durationMinutes ? 'border-red-400' : ''}`}
            {...register('durationMinutes', { required: 'Duration is required', min: { value: 1, message: 'Must be ≥ 1' }, valueAsNumber: true })}
          />
          {errors.durationMinutes && <p className="text-red-500 text-xs">{errors.durationMinutes.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="active-check" className="w-4 h-4 accent-primary" {...register('active')} />
        <label htmlFor="active-check" className="text-sm text-gray-700">Active</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Save Service</Button>
      </div>
    </form>
  )
}

export default function AdminServicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [services, setServices] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [editService, setEditService] = useState(null)
  const [deleteService, setDeleteService] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  async function fetchServices() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getServices()
      setServices(res.data.data.services || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServices() }, [])

  async function handleAdd(data) {
    setSubmitting(true)
    try {
      await adminAPI.createService(data)
      toast.success('Service created.')
      setAddOpen(false)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create service.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(data) {
    setSubmitting(true)
    try {
      await adminAPI.updateService(editService._id, data)
      toast.success('Service updated.')
      setEditService(null)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update service.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await adminAPI.deleteService(deleteService._id)
      toast.success('Service deleted.')
      setDeleteService(null)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete service.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleActive(service) {
    setTogglingId(service._id)
    try {
      await adminAPI.updateService(service._id, { active: !service.active })
      toast.success(`Service ${!service.active ? 'activated' : 'deactivated'}.`)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update service.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 mt-1">Manage wash service offerings.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Service
        </Button>
      </div>

      {loading ? (
        <Spinner message="Loading services..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchServices}>Retry</Button>
        </div>
      ) : services.length === 0 ? (
        <EmptyState icon={Layers} title="No services yet" subtitle="Add your first service to get started." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Vehicle</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Price</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Active</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-800">{s.name}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{s.category}</td>
                  <td className="py-3 px-4">
                    <Badge label={s.vehicleType} />
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-700">
                    ₹{Number(s.price).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{s.durationMinutes} min</td>
                  <td className="py-3 px-4">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(s)}
                      disabled={togglingId === s._id}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        s.active ? 'bg-primary' : 'bg-gray-300'
                      } ${togglingId === s._id ? 'opacity-50 cursor-wait' : ''}`}
                      role="switch"
                      aria-checked={s.active}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          s.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditService(s)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteService(s)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Service" size="lg">
        <ServiceForm onSubmit={handleAdd} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editService} onClose={() => setEditService(null)} title="Edit Service" size="lg">
        {editService && (
          <ServiceForm
            defaultValues={{
              name: editService.name,
              description: editService.description || '',
              vehicleType: editService.vehicleType,
              category: editService.category,
              price: editService.price,
              durationMinutes: editService.durationMinutes,
              active: editService.active,
            }}
            onSubmit={handleEdit}
            loading={submitting}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteService}
        onClose={() => setDeleteService(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Delete "${deleteService?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
