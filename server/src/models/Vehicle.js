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
  },
  { timestamps: true }
);

vehicleSchema.index({ owner: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
