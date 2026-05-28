const responses = require("../models/responses");
const authService = require("../services/auth.service");
const { adminLoginSchema } = require("../models/validation");

const login = (req, res) => {
  const { error, value } = adminLoginSchema.validate(req.body);

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  authService
    .login(value)
    .then((result) => {
      if (!result) {
        return res.status(401).json(new responses.ErrorResponse("Invalid email or password"));
      }

      // Deliver the JWT in an HttpOnly cookie — never expose it to client JS.
      res.cookie(authService.ACCESS_COOKIE, result.token, {
        ...authService.getCookieOptions(),
        maxAge: result.maxAgeMs,
      });

      res.status(200).json(new responses.ItemResponse(result.user));
    })
    .catch((err) => {
      console.error("auth controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const logout = (req, res) => {
  res.clearCookie(authService.ACCESS_COOKIE, authService.getCookieOptions());
  res.status(200).json(new responses.SuccessResponse());
};

// Protected: requires authenticateToken to have populated req.user.
const me = (req, res) => {
  res.status(200).json(new responses.ItemResponse(req.user));
};

module.exports = { login, logout, me };
