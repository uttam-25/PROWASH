import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    type: {
      type: String,
      enum: ['Car', 'Bike', 'Scooty', 'SUV', 'Truck', 'Van'],
      required: [true, 'Vehicle type is required'],
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
    },
    licensePlate: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    photo: {
      type: String, // URL
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Registration lookup fields (all optional) ──────────────────────────
    variant: { type: String, trim: true },
    vehicleClass: { type: String, trim: true },
    fuelType: { type: String, trim: true },
    registrationDate: { type: String },          // 'YYYY-MM-DD' or provider string
    registrationState: { type: String, trim: true },
    rtoCode: { type: String, trim: true },
    rtoName: { type: String, trim: true },
    manufacturingYear: { type: String, trim: true },
    emissionNorm: { type: String, trim: true },

    // Lookup provenance
    lookupProvider: { type: String, trim: true },  // 'rapidapi' | 'manual'
    lookupAt: { type: Date },
    lookupVerified: { type: Boolean, default: false }, // true only when provider confirmed
  },
  { timestamps: true }
);

vehicleSchema.index({ owner: 1 });
// Enforce one active vehicle per owner at the database level.
// sparse: true means the index ignores documents where isActive is false (soft-deleted).
vehicleSchema.index({ owner: 1, isActive: 1 }, {
  unique: true,
  partialFilterExpression: { isActive: true },
  name: 'one_active_vehicle_per_owner',
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
