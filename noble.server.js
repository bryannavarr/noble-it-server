// Load env vars before any other require, since modules like the DB pool
// read process.env at require time.
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = require("crypto").webcrypto;
}
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const router = require("./noble-app/routes");

const app = express();

// In prod we sit behind nginx, which adds X-Forwarded-For with the real client
// IP. Tell Express to trust one upstream proxy so req.ip is correct and
// express-rate-limit can key on the actual client (otherwise it throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR). "1" = trust one hop (just nginx).
app.set("trust proxy", 1);
const port = process.env.PORT || 5005;

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "x-access-token"],
    credentials: true,
  }),
);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parsing (required to read the HttpOnly auth cookie)
app.use(cookieParser());

// Routes
app.use(router);

app.listen(port, "127.0.0.1", () => {
  console.log(`Noble-IT is ready for business on port ${port}.`);
});
