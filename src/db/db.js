import dotenv from 'dotenv'
dotenv.config();
import mongoose from 'mongoose';

async function connectDB(){
    await mongoose.connect(process.env.MONGO_URL)
    console.log("Connected with database successfully");
}

export default connectDB;