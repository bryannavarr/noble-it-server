// Load env vars before any other require, since modules like the DB pool
// read process.env at require time.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const router = require("./noble-app/routes");

const app = express();
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
