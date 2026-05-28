const responses = require("../models/responses");
const authService = require("../services/auth.service");

const extractToken = (req) => {
  // Cookie is the primary (browser) transport.
  const cookieToken = req.cookies && req.cookies[authService.ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  // Header fallback for non-browser API clients.
  const header = req.headers["authorization"];
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return req.headers["x-access-token"] || null;
};

const authenticateToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json(new responses.ErrorResponse("Authentication token is required"));
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json(new responses.ErrorResponse("Invalid or expired token"));
  }
};

module.exports = { authenticateToken };
