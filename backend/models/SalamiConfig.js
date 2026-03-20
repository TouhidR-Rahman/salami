const mongoose = require("mongoose");

const salamiConfigSchema = new mongoose.Schema(
  {
    minAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    maxAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    decimalPlaces: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 2,
    },
    unit: {
      type: String,
      required: true,
      default: "BDT",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure only one config document exists
salamiConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({});
  if (!config) {
    config = await this.create({
      minAmount: 1,
      maxAmount: 10,
      decimalPlaces: 2,
      unit: "BDT",
    });
  }
  return config;
};

// Update config with validation
salamiConfigSchema.statics.updateConfig = async function (updates) {
  // Validate that minAmount <= maxAmount
  if (updates.minAmount !== undefined && updates.maxAmount !== undefined) {
    if (updates.minAmount > updates.maxAmount) {
      throw new Error("Minimum amount cannot be greater than maximum amount");
    }
  }

  let config = await this.findOne({});
  if (!config) {
    config = new this(updates);
  } else {
    Object.assign(config, updates);
  }
  await config.save();
  return config;
};

module.exports = mongoose.model("SalamiConfig", salamiConfigSchema);
