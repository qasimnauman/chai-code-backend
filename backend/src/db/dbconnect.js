import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_DB_URL}/${DB_NAME}`)
        console.log(`\n Mongo DB Connected !! DB Host: ${connectionInstance.connection.host}`)
    } catch (err) {
        console.log("Error", err);
        process.exit(1);
    }
}

export default connectDB;