import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if (!localfilepath) return null
        // Uploading file on Cloudindary
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localfilepath)
        // File has been uploaded successfully
        return response
    } catch (error) {
        fs.unlinkSync(localfilepath) //Removes the locally saved temoprary file as the upload operation fails
        return null
    }
}

export { uploadOnCloudinary }