
import express from 'express';
import connectDB from './db/db.js'
import routes from './routes/index.js'

import cors from 'cors'
import cookieParser from 'cookie-parser'


connectDB();

// const allowedOrigins = [
//   "https://guptkhabre.vercel.app",
//   "https://guptkhabre.com",
//   "http://localhost:3000",
//   "http://localhost:3001"
// ];


const app=express();


app.use(cors({
  origin: "https://guptkhabre.vercel.app",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.use("/api", routes);



export default app;