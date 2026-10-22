import { Router } from 'express';
import {
  getMyVehicles,
  addVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  getAllVehicles,
  lookupVehicleByReg,
  replaceVehicle,
} from '../controllers/vehicleController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate, vehicleRules } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';

// Rate-limit the lookup endpoint — max 20 lookups per customer per 15 min
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many lookup requests. Please try again in a few minutes.' },
});

const router = Router();

// ── Lookup (must come before /:id to avoid being swallowed) ──
router.post('/lookup', protect, lookupLimiter, lookupVehicleByReg);

// ── Customer routes ──
router.get('/my', protect, getMyVehicles);
router.post('/', protect, validate(vehicleRules), addVehicle);
router.put('/replace', protect, validate(vehicleRules), replaceVehicle);
router.get('/:id', protect, getVehicle);
router.put('/:id', protect, updateVehicle);
router.delete('/:id', protect, deleteVehicle);

// ── Admin routes ──
router.get('/admin/vehicles', protect, requireAdmin, getAllVehicles);

export default router;
