/**
 * Admin Dashboard JavaScript
 * Handles authentication, configuration management, and registration tracking
 */

// Get API base URL
function getApiBase() {
  const override = window.localStorage.getItem("SALAMI_API_BASE");
  if (override) {
    return override;
  }

  if (
    window.location.hostname === "localhost" &&
    window.location.port &&
    window.location.port !== "3000"
  ) {
    return "http://localhost:3000/api";
  }

  return "/api";
}

const API_BASE = getApiBase();
let adminToken = null;

// ===== DOM ELEMENTS =====
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const adminPasswordInput = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const registrationsList = document.getElementById("registrationsList");
const configMessage = document.getElementById("configMessage");
const registrationsMessage = document.getElementById("registrationsMessage");
const updateConfigBtn = document.getElementById("updateConfigBtn");
const refreshStatsBtn = document.getElementById("refreshStatsBtn");
const refreshRegistrationsBtn = document.getElementById(
  "refreshRegistrationsBtn",
);

// Form inputs
const minAmountInput = document.getElementById("minAmount");
const maxAmountInput = document.getElementById("maxAmount");
const decimalPlacesInput = document.getElementById("decimalPlaces");
const unitInput = document.getElementById("unit");
const currentConfigDisplay = document.getElementById("currentConfig");

// Stats
const totalRegistrationsSpan = document.getElementById("totalRegistrations");
const totalSalamiDistributedSpan = document.getElementById(
  "totalSalamiDistributed",
);

// ===== MESSAGE DISPLAY FUNCTIONS =====
function showMessage(elementId, message, type) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.className = `message show ${type}`;

  setTimeout(() => {
    messageEl.classList.remove("show");
  }, 4000);
}

// ===== LOGIN LOGIC =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = adminPasswordInput.value.trim();

  if (!password) {
    loginError.textContent = "Please enter a password";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (data.success) {
      adminToken = data.token;
      window.localStorage.setItem("admin_token", adminToken);
      loginError.textContent = "";
      loginScreen.classList.add("hidden");
      dashboard.style.display = "block";
      adminPasswordInput.value = "";

      // Load initial data
      await loadConfig();
      await loadRegistrations();
      await loadStats();
    } else {
      loginError.textContent = data.message || "Invalid password";
    }
  } catch (error) {
    console.error("Login error:", error);
    loginError.textContent = "Connection error. Please try again.";
  }
});

logoutBtn.addEventListener("click", () => {
  adminToken = null;
  window.localStorage.removeItem("admin_token");
  adminPasswordInput.value = "";
  loginError.textContent = "";
  loginScreen.classList.remove("hidden");
  dashboard.style.display = "none";
});

// ===== CONFIG MANAGEMENT =====
async function loadConfig() {
  try {
    const response = await fetch(`${API_BASE}/admin/config`, {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load config");
    }

    const data = await response.json();

    if (data.success) {
      const config = data.config;

      // Update form inputs
      minAmountInput.value = config.minAmount;
      maxAmountInput.value = config.maxAmount;
      decimalPlacesInput.value = config.decimalPlaces;
      unitInput.value = config.unit;

      // Update display
      updateCurrentConfigDisplay(config);
    }
  } catch (error) {
    console.error("Error loading config:", error);
    showMessage("configMessage", "Failed to load configuration", "error");
  }
}

function updateCurrentConfigDisplay(config) {
  const configText = `
    Min: ${config.minAmount} | Max: ${config.maxAmount} |
    Decimals: ${config.decimalPlaces} | Unit: ${config.unit}
  `;
  currentConfigDisplay.textContent = configText;
}

updateConfigBtn.addEventListener("click", async () => {
  const minAmount = parseFloat(minAmountInput.value);
  const maxAmount = parseFloat(maxAmountInput.value);
  const decimalPlaces = parseInt(decimalPlacesInput.value);
  const unit = unitInput.value.trim();

  // Validation
  if (isNaN(minAmount) || isNaN(maxAmount)) {
    showMessage("configMessage", "Please enter valid amounts", "error");
    return;
  }

  if (minAmount > maxAmount) {
    showMessage(
      "configMessage",
      "Minimum amount cannot be greater than maximum",
      "error",
    );
    return;
  }

  if (isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 5) {
    showMessage(
      "configMessage",
      "Decimal places must be between 0 and 5",
      "error",
    );
    return;
  }

  if (!unit) {
    showMessage("configMessage", "Unit name cannot be empty", "error");
    return;
  }

  try {
    updateConfigBtn.disabled = true;
    updateConfigBtn.textContent = "Updating...";

    const response = await fetch(`${API_BASE}/admin/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        minAmount,
        maxAmount,
        decimalPlaces,
        unit,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showMessage(
        "configMessage",
        "Configuration updated successfully!",
        "success",
      );
      updateCurrentConfigDisplay(data.config);
    } else {
      showMessage(
        "configMessage",
        data.message || "Failed to update config",
        "error",
      );
    }
  } catch (error) {
    console.error("Error updating config:", error);
    showMessage("configMessage", "Connection error", "error");
  } finally {
    updateConfigBtn.disabled = false;
    updateConfigBtn.textContent = "Update Configuration";
  }
});

// ===== REGISTRATIONS MANAGEMENT =====
async function loadRegistrations() {
  try {
    const response = await fetch(`${API_BASE}/admin/registrations`, {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load registrations");
    }

    const data = await response.json();

    if (data.success) {
      displayRegistrations(data.registrations);
    }
  } catch (error) {
    console.error("Error loading registrations:", error);
    registrationsList.innerHTML =
      '<div class="empty-state">Failed to load registrations</div>';
  }
}

function displayRegistrations(registrations) {
  if (registrations.length === 0) {
    registrationsList.innerHTML =
      '<div class="empty-state">No registrations yet</div>';
    return;
  }

  registrationsList.innerHTML = registrations
    .map(
      (reg) =>
        `
    <div class="registration-item">
      <div class="registration-info">
        <p><strong>${escapeHtml(reg.name)}</strong></p>
        <p>Method: ${reg.paymentMethod} | Number: ${reg.paymentNumber}</p>
        <div class="salami-amount">${reg.salamiFormatted}</div>
        <p style="font-size: 12px; color: #999;">
          ${new Date(reg.registeredAt).toLocaleString()}
        </p>
      </div>
      <button class="delete-btn" onclick="deleteRegistration('${reg.id}')">
        Delete
      </button>
    </div>
  `,
    )
    .join("");
}

async function deleteRegistration(registrationId) {
  if (!confirm("Are you sure you want to delete this registration?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/admin/registrations/${registrationId}`,
      {
        method: "DELETE",
        headers: {
          "x-admin-token": adminToken,
        },
      },
    );

    const data = await response.json();

    if (data.success) {
      showMessage("registrationsMessage", "Registration deleted", "success");
      await loadRegistrations();
      await loadStats();
    } else {
      showMessage(
        "registrationsMessage",
        data.message || "Failed to delete registration",
        "error",
      );
    }
  } catch (error) {
    console.error("Error deleting registration:", error);
    showMessage("registrationsMessage", "Connection error", "error");
  }
}

// ===== STATS =====
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/admin/registrations`, {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load stats");
    }

    const data = await response.json();

    if (data.success) {
      const registrations = data.registrations;
      totalRegistrationsSpan.textContent = registrations.length;

      // Calculate total salami
      const totalSalami = registrations.reduce(
        (sum, reg) => sum + reg.salamiAmount,
        0,
      );

      // Get decimal places from current config
      const config = await (
        await fetch(`${API_BASE}/admin/config`, {
          headers: {
            "x-admin-token": adminToken,
          },
        })
      ).json();

      const decimalPlaces = config.config.decimalPlaces;
      const unit = config.config.unit;

      totalSalamiDistributedSpan.textContent =
        totalSalami.toFixed(decimalPlaces) + " " + unit;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
    totalRegistrationsSpan.textContent = "-";
    totalSalamiDistributedSpan.textContent = "-";
  }
}

refreshStatsBtn.addEventListener("click", loadStats);
refreshRegistrationsBtn.addEventListener("click", async () => {
  refreshRegistrationsBtn.disabled = true;
  refreshRegistrationsBtn.textContent = "Refreshing...";
  try {
    await loadRegistrations();
    await loadStats();
    showMessage("registrationsMessage", "Registrations refreshed", "success");
  } finally {
    refreshRegistrationsBtn.disabled = false;
    refreshRegistrationsBtn.textContent = "Refresh Registrations";
  }
});

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== INITIAL LOAD =====
// Try to restore session from localStorage
const savedToken = window.localStorage.getItem("admin_token");
if (savedToken) {
  adminToken = savedToken;
  // Verify token is still valid
  fetch(`${API_BASE}/admin/registrations`, {
    headers: {
      "x-admin-token": adminToken,
    },
  })
    .then((r) => {
      if (r.ok) {
        loginScreen.classList.add("hidden");
        dashboard.style.display = "block";
        loadConfig();
        loadRegistrations();
        loadStats();
      } else {
        window.localStorage.removeItem("admin_token");
      }
    })
    .catch(() => {
      window.localStorage.removeItem("admin_token");
    });
}

// Auto-refresh registrations every 10 seconds
setInterval(() => {
  if (adminToken && dashboard.style.display !== "none") {
    loadRegistrations();
  }
}, 10000);
