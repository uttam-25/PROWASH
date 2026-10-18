import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['exterior', 'interior', 'full', 'premium'],
      required: [true, 'Category is required'],
    },
    vehicleTypes: {
      type: [String],
      default: ['Car', 'Bike', 'Scooty', 'SUV', 'Truck', 'Van'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);

export default Service;
