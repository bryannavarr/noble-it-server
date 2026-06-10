const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userService = require("./user.service");

const ACCESS_COOKIE = "noble_admin_token";

// A valid hash to compare against when no user is found, so login timing
// doesn't reveal whether an email exists in the database.
const DUMMY_HASH = bcrypt.hashSync("invalid-placeholder-password", 10);

// Base attributes for the auth cookie. Used for both setting (login) and
// clearing (logout) — clearCookie must receive matching attributes.
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

const getConfig = () => {
  const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

  if (!JWT_SECRET) {
    throw new Error("Auth is not configured: JWT_SECRET is required.");
  }

  return {
    secret: JWT_SECRET,
    expiresIn: JWT_EXPIRES_IN || "1d",
  };
};

// Returns { token, user, maxAgeMs } on success, or null when credentials are invalid.
const login = async ({ email, password }) => {
  const config = getConfig();

  const account = await userService.findByEmail(email);
  const passwordMatches = await bcrypt.compare(
    password,
    account ? account.password_hash : DUMMY_HASH,
  );

  if (!account || !account.is_active || !passwordMatches) return null;

  await userService.touchLastLogin(account.id);

  const user = { id: account.id, email: account.email, role: account.role };
  const token = jwt.sign(user, config.secret, { expiresIn: config.expiresIn });

  // Derive the cookie lifetime from the token so the two never drift apart.
  const { iat, exp } = jwt.decode(token);
  const maxAgeMs = (exp - iat) * 1000;

  return { token, user, maxAgeMs };
};

// Returns the decoded payload, or throws if the token is missing/invalid/expired.
const verifyToken = (token) => {
  const { secret } = getConfig();
  return jwt.verify(token, secret);
};

module.exports = { login, verifyToken, getCookieOptions, ACCESS_COOKIE };
