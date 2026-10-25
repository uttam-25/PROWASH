import mongoose from 'mongoose';

const partnerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, required: true },
    serviceAddress: { type: String, trim: true },
    aadhaarNumber: { type: String, select: false },
    vehicleOwned: { type: String },
    serviceCategories: { type: [String], default: [] },
    supportedServiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    serviceRadius: { type: Number, default: 10 },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    locationUpdatedAt: { type: Date, default: null },
    isAvailable: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    assignmentLockId: { type: String, default: null, select: false },
    assignmentLockUntil: { type: Date, default: null, select: false },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    totalEarnings: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    documents: [
      {
        type: { type: String },
        url: String,
        verified: { type: Boolean, default: false },
      },
    ],
    bankDetails: {
      accountNumber: { type: String, select: false },
      ifsc: String,
      accountName: String,
    },
  },
  { timestamps: true }
);

partnerProfileSchema.index({ currentLocation: '2dsphere' });

const PartnerProfile = mongoose.model('PartnerProfile', partnerProfileSchema);
export default PartnerProfile;
