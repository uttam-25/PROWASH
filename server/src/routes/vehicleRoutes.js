import { Router } from 'express';
import {
  getMyVehicles,
  addVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  getAllVehicles,
} from '../controllers/vehicleController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, vehicleRules } from '../middleware/validate.js';

const router = Router();

// Customer routes
router.get('/my', protect, getMyVehicles);
router.post('/', protect, validate(vehicleRules), addVehicle);
router.get('/:id', protect, getVehicle);
router.put('/:id', protect, updateVehicle);
router.delete('/:id', protect, deleteVehicle);

// Admin routes
router.get('/admin/vehicles', protect, requireAdmin, getAllVehicles);

export default router;
