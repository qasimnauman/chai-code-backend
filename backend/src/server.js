import dotenv from "dotenv"
import connectDB from "./db/dbconnect.js"

dotenv.config({
    path: './.env'
});

connectDB();