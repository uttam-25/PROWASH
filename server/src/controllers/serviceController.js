import Service from '../models/Service.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// GET /api/services  (public — active only)
// ---------------------------------------------------------------------------
export const getServices = async (req, res, next) => {
  try {
    const filter = req.query.includeInactive === 'true' ? {} : { isActive: true };
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.vehicleType) {
      filter.vehicleTypes = req.query.vehicleType;
    }

    const services = await Service.find(filter).sort({ category: 1, price: 1 });
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/services/:id  (public)
// ---------------------------------------------------------------------------
export const getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return next(new AppError('Service not found', 404));
    }
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/services  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const createService = async (req, res, next) => {
  try {
    const { name, description, category, vehicleTypes, price, duration, imageUrl } = req.body;

    const service = await Service.create({
      name,
      description,
      category,
      vehicleTypes,
      price,
      duration,
      imageUrl,
    });

    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/services/:id  (protect + requireAdmin)
// ---------------------------------------------------------------------------
export const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    const allowed = ['name', 'description', 'category', 'vehicleTypes', 'price', 'duration', 'imageUrl', 'isActive'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/services/:id  (protect + requireAdmin, soft-delete)
// ---------------------------------------------------------------------------
export const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    service.isActive = false;
    await service.save();

    res.json({ success: true, data: { message: 'Service deactivated successfully' } });
  } catch (err) {
    next(err);
  }
};
