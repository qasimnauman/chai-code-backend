import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import path from "path";
import { Apierror } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilepath, userId, directory) => {
    try {
        if (!localfilepath) return null
        const filename = path.basename(localfilepath)
        console.log(filename);
        // Uploading file on Cloudindary
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto",
            use_filename: true,
            public_id: `${userId}-${filename}`,
            folder: `youtube/${directory}`,
            overwrite: true,
            chunk_size: 6000000
        })
        fs.unlinkSync(localfilepath)
        // File has been uploaded successfully
        return response
    } catch (error) {
        fs.unlinkSync(localfilepath) //Removes the locally saved temoprary file as the upload operation fails
        return null
    }
}

const deletefromCloudinary = async (url) => {
    try {
        const splitURL = url.split("/");
        console.log("Split URL:", splitURL);

        let publicId = splitURL.slice(7).join("/");

        publicId = publicId.replace(/\.(jpg|jpeg|png|webp|gif|mp4|mov|avi|mkv)$/, "");

        console.log("Corrected Public ID:", publicId);

        const fileExtension = url.split('.').pop().toLowerCase();
        let resourceType = fileExtension === "mp4" || fileExtension === "mov" || fileExtension === "avi" || fileExtension === "mkv" ? "video" : "image";

        const deleteResponse = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

        console.log("Delete Response:", deleteResponse);
        return deleteResponse;
    } catch (error) {
        throw new Apierror(404, `No resource found for ${url} to delete`);
    }
};

export {
    uploadOnCloudinary,
    deletefromCloudinary
}