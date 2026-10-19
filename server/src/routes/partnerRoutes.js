import { Router } from 'express';
import { protect, requirePartner } from '../middleware/auth.js';
import {
  registerPartner,
  getPartnerProfile,
  updatePartnerProfile,
  updateLocation,
  toggleAvailability,
  getNearbyRequests,
  acceptRequest,
  rejectRequest,
  updateJobStatus,
  getMyJobs,
  getJobById,
  uploadPhotos,
} from '../controllers/partnerController.js';

const router = Router();

// Public
router.post('/register', registerPartner);

// Protected — partner only
router.get('/profile', protect, requirePartner, getPartnerProfile);
router.patch('/profile', protect, requirePartner, updatePartnerProfile);
router.patch('/location', protect, requirePartner, updateLocation);
router.patch('/availability', protect, requirePartner, toggleAvailability);
router.get('/requests', protect, requirePartner, getNearbyRequests);
router.patch('/requests/:bookingId/accept', protect, requirePartner, acceptRequest);
router.patch('/requests/:bookingId/reject', protect, requirePartner, rejectRequest);
router.get('/jobs', protect, requirePartner, getMyJobs);
router.get('/jobs/:bookingId', protect, requirePartner, getJobById);
router.patch('/jobs/:bookingId/status', protect, requirePartner, updateJobStatus);
router.post('/jobs/:bookingId/photos', protect, requirePartner, uploadPhotos);

export default router;
