const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const router = require("./noble-app/routes");

// initialize dotenv first before anything else
dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3001",
];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "x-access-token",
    ],
    credentials: true,
  }),
);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use(router);

app.listen(port, "127.0.0.1", () => {
  console.log(`Noble-IT is ready for business on port ${port}.`);
});
