
import express from 'express';
import connectDB from './db/db.js'
import routes from './routes/index.js'

import cors from 'cors'
import cookieParser from 'cookie-parser'


connectDB();

const app=express();
app.use(express.json());

app.use(cors({
  origin:true,
  credentials: true
}));

app.use(cookieParser());

app.use("/api", routes);



export default app;