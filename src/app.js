
import express from 'express';
import connectDB from './db/db.js'
import routes from './routes/index.js'

import cors from 'cors'
import cookieParser from 'cookie-parser'
const allowedOrigins = [
   "https://guptkhabre.vercel.app/",
   "https://guptkhabre.com",
  "http://localhost:3000",
  "http://localhost:3001",
 
  
];

connectDB();

const app=express();
app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(cookieParser());

app.use("/api", routes);



export default app;