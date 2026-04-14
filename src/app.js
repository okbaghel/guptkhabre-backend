
import express from 'express';
import connectDB from './db/db.js'
import routes from './routes/index.js'

import cors from 'cors'
import cookieParser from 'cookie-parser'


connectDB();

const allowedOrigins = [
  "https://guptkhabre.vercel.app",
  "https://guptkhabre.com",
  "http://localhost:3000",
  "http://localhost:3001"
];


const app=express();


app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS not allowed: " + origin));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.use("/api", routes);



export default app;