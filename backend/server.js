const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const { connectDB, closeDB } = require("./config/database");
const Registration = require("./models/Registration");
const SalamiConfig = require("./models/SalamiConfig");
const adminAuth = require("./middleware/adminAuth");
const {
  generateSalamiAmount: generateSalamiAmountStatic,
  formatSalamiAmount: formatSalamiAmountStatic,
  SALAMI_CONFIG,
} = require("./config/salami");

const app = express();
const PORT = process.env.PORT || 3000;

// Current salami config (will be loaded from DB on startup)
let currentSalamiConfig = SALAMI_CONFIG;

// Generate salami amount with current config
function generateSalamiAmount() {
  const min = currentSalamiConfig.minAmount;
  const max = currentSalamiConfig.maxAmount;
  const randomAmount = Math.random() * (max - min) + min;
  const rounded =
    Math.round(randomAmount * Math.pow(10, currentSalamiConfig.decimalPlaces)) /
    Math.pow(10, currentSalamiConfig.decimalPlaces);
  return rounded;
}

// Format salami amount with current config
function formatSalamiAmount(amount) {
  return `${amount.toFixed(currentSalamiConfig.decimalPlaces)} ${currentSalamiConfig.unit}`;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes

// Serve index.html for root and any non-API paths
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Serve admin dashboard
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

function validateRegistrationPayload(body) {
  const { name, paymentMethod, paymentNumber } = body;

  if (!name || !paymentMethod || !paymentNumber) {
    return "All fields are required";
  }

  if (!["bKash", "Nagad"].includes(paymentMethod)) {
    return "Invalid payment method";
  }

  if (!/^\d{11}$/.test(paymentNumber)) {
    return "Payment number must be exactly 11 digits";
  }

  if (String(name).trim().length < 2) {
    return "Name must be at least 2 characters long";
  }

  return null;
}

function mapRegistration(registration) {
  return {
    id: registration._id,
    name: registration.name,
    paymentMethod: registration.paymentMethod,
    paymentNumber: registration.paymentNumber,
    salamiAmount: registration.salamiAmount,
    salamiFormatted: formatSalamiAmount(registration.salamiAmount),
    registeredAt: registration.registeredAt,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt,
  };
}

function isDuplicateError(error) {
  return error && error.code === 11000;
}

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, paymentMethod, paymentNumber } = req.body;
    const validationError = validateRegistrationPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Generate random salami amount
    const salamiAmount = generateSalamiAmount();

    const registration = await Registration.create({
      name: name.trim(),
      paymentMethod,
      paymentNumber,
      salamiAmount,
      registeredAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      registration: mapRegistration(registration),
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (isDuplicateError(error)) {
      return res.status(400).json({
        success: false,
        message:
          "This payment number is already registered with this payment method",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
});

// Get all registrations
app.get("/api/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find({})
      .sort({ registeredAt: -1 })
      .lean();

    const formatted = registrations.map(mapRegistration);

    res.json({
      success: true,
      count: formatted.length,
      salamiConfig: SALAMI_CONFIG,
      registrations: formatted,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
    });
  }
});

// Get registration by ID
app.get("/api/registrations/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID",
      });
    }

    const registration = await Registration.findById(req.params.id).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.json({
      success: true,
      registration: mapRegistration(registration),
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registration",
    });
  }
});

// Delete registration by ID
app.delete("/api/registrations/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID",
      });
    }

    const registration = await Registration.findByIdAndDelete(
      req.params.id,
    ).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.json({
      success: true,
      message: "Registration deleted successfully",
      registration: mapRegistration(registration),
    });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting registration",
    });
  }
});

// Update registration by ID
app.put("/api/registrations/:id", async (req, res) => {
  try {
    const { name, paymentMethod, paymentNumber } = req.body;
    const validationError = validateRegistrationPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID",
      });
    }

    const updated = await Registration.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name.trim(),
          paymentMethod,
          paymentNumber,
        },
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      },
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.json({
      success: true,
      message: "Registration updated successfully",
      registration: mapRegistration(updated),
    });
  } catch (error) {
    console.error("Error updating registration:", error);

    if (isDuplicateError(error)) {
      return res.status(400).json({
        success: false,
        message:
          "This payment number is already registered with this payment method",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating registration",
    });
  }
});

// Get salami configuration
app.get("/api/config/salami", (req, res) => {
  res.json({
    success: true,
    config: currentSalamiConfig,
  });
});

// ===== ADMIN ROUTES =====

// Admin login - verify password
app.post("/api/admin/login", async (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  if (password === adminPassword) {
    return res.json({
      success: true,
      message: "Login successful",
      token: password,
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid password",
  });
});

// Get salami config (admin only)
app.get("/api/admin/config", adminAuth, async (req, res) => {
  try {
    const config = await SalamiConfig.getConfig();
    res.json({
      success: true,
      config: {
        minAmount: config.minAmount,
        maxAmount: config.maxAmount,
        decimalPlaces: config.decimalPlaces,
        unit: config.unit,
      },
    });
  } catch (error) {
    console.error("Error fetching admin config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching config",
    });
  }
});

// Update salami config (admin only)
app.post("/api/admin/config", adminAuth, async (req, res) => {
  try {
    const { minAmount, maxAmount, decimalPlaces, unit } = req.body;

    // Validate inputs
    if (minAmount !== undefined && maxAmount !== undefined) {
      if (minAmount > maxAmount) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount cannot be greater than maximum amount",
        });
      }
    }

    if (decimalPlaces !== undefined) {
      if (decimalPlaces < 0 || decimalPlaces > 5) {
        return res.status(400).json({
          success: false,
          message: "Decimal places must be between 0 and 5",
        });
      }
    }

    // Update config
    const updates = {};
    if (minAmount !== undefined) updates.minAmount = minAmount;
    if (maxAmount !== undefined) updates.maxAmount = maxAmount;
    if (decimalPlaces !== undefined) updates.decimalPlaces = decimalPlaces;
    if (unit !== undefined) updates.unit = unit.trim();

    const updated = await SalamiConfig.updateConfig(updates);

    // Update current config in memory
    currentSalamiConfig = {
      minAmount: updated.minAmount,
      maxAmount: updated.maxAmount,
      decimalPlaces: updated.decimalPlaces,
      unit: updated.unit,
    };

    res.json({
      success: true,
      message: "Configuration updated successfully",
      config: currentSalamiConfig,
    });
  } catch (error) {
    console.error("Error updating admin config:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating config",
    });
  }
});

// Get all registrations (admin only)
app.get("/api/admin/registrations", adminAuth, async (req, res) => {
  try {
    const registrations = await Registration.find({})
      .sort({ registeredAt: -1 })
      .lean();

    const formatted = registrations.map(mapRegistration);

    res.json({
      success: true,
      count: formatted.length,
      registrations: formatted,
    });
  } catch (error) {
    console.error("Error fetching admin registrations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registrations",
    });
  }
});

// Delete registration (admin only)
app.delete("/api/admin/registrations/:id", adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID",
      });
    }

    const registration = await Registration.findByIdAndDelete(
      req.params.id,
    ).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    res.json({
      success: true,
      message: "Registration deleted successfully",
      registration: mapRegistration(registration),
    });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting registration",
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await Registration.init();

    // Initialize salami config from database
    const dbConfig = await SalamiConfig.getConfig();
    currentSalamiConfig = {
      minAmount: dbConfig.minAmount,
      maxAmount: dbConfig.maxAmount,
      decimalPlaces: dbConfig.decimalPlaces,
      unit: dbConfig.unit,
    };
    console.log("Salami config loaded from database:", currentSalamiConfig);

    app.listen(PORT, () => {
      console.log(`Salami App Backend running on http://localhost:${PORT}`);
      console.log(`Register: POST http://localhost:${PORT}/api/register`);
      console.log(
        `All registrations: GET http://localhost:${PORT}/api/registrations`,
      );
      console.log(
        `Salami Config: GET http://localhost:${PORT}/api/config/salami`,
      );
      console.log(`Admin Dashboard: GET http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

startServer();
