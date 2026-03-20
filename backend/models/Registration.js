const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["bKash", "Nagad"],
      default: "bKash",
    },
    paymentNumber: {
      type: String,
      required: true,
      match: /^\d{11}$/,
      trim: true,
    },
    salamiAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index to allow same number in different payment methods
registrationSchema.index(
  { paymentNumber: 1, paymentMethod: 1 },
  { unique: true },
);
registrationSchema.index({ registeredAt: -1 });

module.exports = mongoose.model("Registration", registrationSchema);
