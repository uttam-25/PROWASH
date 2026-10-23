import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import { AppError } from '../middleware/errorHandler.js';

// Helper to check vehicle ownership
const checkOwnership = (vehicle, userId) => {
  if (vehicle.owner.toString() !== userId.toString()) {
    throw new AppError('Not authorised to access this vehicle', 403);
  }
};

// ---------------------------------------------------------------------------
// GET /api/vehicles/my  (protect)
// ---------------------------------------------------------------------------
export const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: vehicles });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/vehicles  (protect)
// ---------------------------------------------------------------------------
export const addVehicle = async (req, res, next) => {
  try {
    const existing = await Vehicle.findOne({ owner: req.user._id, isActive: true });
    if (existing) {
      return next(new AppError('You already have a registered vehicle. Update or replace it instead.', 409));
    }

    const {
      type, make, model, year, licensePlate, color, photo,
      // lookup-enriched fields
      variant, vehicleClass, fuelType, registrationDate,
      registrationState, rtoCode, rtoName, manufacturingYear,
      emissionNorm, lookupProvider, lookupAt, lookupVerified,
    } = req.body;

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      type, make, model, year, licensePlate, color, photo,
      variant, vehicleClass, fuelType, registrationDate,
      registrationState, rtoCode, rtoName, manufacturingYear,
      emissionNorm,
      lookupProvider: lookupProvider || 'manual',
      lookupAt: lookupAt || null,
      lookupVerified: lookupVerified || false,
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/vehicles/:id  (protect, ownership check)
// ---------------------------------------------------------------------------
export const getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || !vehicle.isActive) {
      return next(new AppError('Vehicle not found', 404));
    }
    checkOwnership(vehicle, req.user._id);
    res.json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/vehicles/:id  (protect, ownership check)
// ---------------------------------------------------------------------------
export const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || !vehicle.isActive) {
      return next(new AppError('Vehicle not found', 404));
    }
    checkOwnership(vehicle, req.user._id);

    const { type, make, model, year, licensePlate, color, photo } = req.body;
    const allowedUpdates = { type, make, model, year, licensePlate, color, photo };

    // Remove undefined values so we don't overwrite with undefined
    Object.keys(allowedUpdates).forEach((k) => {
      if (allowedUpdates[k] !== undefined) {
        vehicle[k] = allowedUpdates[k];
      }
    });

    await vehicle.save();
    res.json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/vehicles/:id  (protect, ownership check, soft-delete)
// ---------------------------------------------------------------------------
export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || !vehicle.isActive) {
      return next(new AppError('Vehicle not found', 404));
    }
    checkOwnership(vehicle, req.user._id);

    vehicle.isActive = false;
    await vehicle.save();

    res.json({ success: true, data: { message: 'Vehicle removed successfully' } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/vehicles  (protect + requireAdmin, paginated)
// ---------------------------------------------------------------------------
export const getAllVehicles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }

    const total = await Vehicle.countDocuments(filter);
    const items = await Vehicle.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/vehicles/replace  (protect)
// ---------------------------------------------------------------------------
export const replaceVehicle = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Soft-delete all active vehicles for this customer (within the transaction)
    await Vehicle.updateMany(
      { owner: req.user._id, isActive: true },
      { isActive: false },
      { session }
    );
    const {
      type, make, model, year, licensePlate, color, photo,
      variant, vehicleClass, fuelType, registrationDate,
      registrationState, rtoCode, rtoName, manufacturingYear,
      emissionNorm, lookupProvider, lookupAt, lookupVerified,
    } = req.body;
    const [vehicle] = await Vehicle.create([{
      owner: req.user._id,
      type, make, model, year, licensePlate, color, photo,
      variant, vehicleClass, fuelType, registrationDate,
      registrationState, rtoCode, rtoName, manufacturingYear,
      emissionNorm,
      lookupProvider: lookupProvider || 'manual',
      lookupAt: lookupAt || null,
      lookupVerified: lookupVerified || false,
    }], { session });
    await session.commitTransaction();
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ---------------------------------------------------------------------------
// POST /api/vehicles/lookup  (protect)
// ---------------------------------------------------------------------------
import {
  normaliseRegNumber,
  validateRegNumber,
  lookupVehicle,
} from '../services/vehicleLookupService.js';

export const lookupVehicleByReg = async (req, res, next) => {
  try {
    const { registrationNumber } = req.body;

    if (!registrationNumber) {
      return next(new AppError('registrationNumber is required', 400));
    }

    const normalised = normaliseRegNumber(String(registrationNumber));

    if (!validateRegNumber(normalised)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid registration number format. ' +
          'Use the standard Indian format, e.g. MH12AB1234 or BH series 22BH1234AB.',
        regNumber: normalised,
      });
    }

    const result = await lookupVehicle(normalised);

    // Respond with the lookup result — never 500 for "not found"
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
