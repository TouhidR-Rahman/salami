/**
 * Admin Authentication Middleware
 * Verifies admin password/token before allowing access to admin routes
 */

function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  // Check token in header first, then query parameter, then body
  const token =
    req.headers["x-admin-token"] ||
    req.query.token ||
    (req.body && req.body.token);

  if (!token || token !== adminPassword) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing admin password",
    });
  }

  // Token is valid, proceed to next middleware/route
  next();
}

module.exports = adminAuth;
