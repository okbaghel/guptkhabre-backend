
import express from 'express';
import connectDB from './db/db.js'
import routes from './routes/index.js'

import cors from 'cors'
import cookieParser from 'cookie-parser'


connectDB();

const staticAllowedOrigins = [
  "https://guptkhabre.vercel.app",
  "https://guptkhabre.com",
  "https://www.guptkhabre.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

const envAllowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...staticAllowedOrigins, ...envAllowedOrigins])];

const isTrustedOrigin = (origin) => {
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/i.test(origin)) return true;
  return false;
};


const app=express();


app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);

    if (isTrustedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.use("/api", routes);



export default app;