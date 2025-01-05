import mongoose, { Schema } from "mongoose"
import mongooseAgregateSchema from "mongoose-aggregate-paginate-v2"


const videoSchema = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    videofile: {
        type: String, //Cloudinary URL
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    duration: {
        type: Number, //Cloudinary URL
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false,
        required: true
    },
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

videoSchema.plugin(mongooseAgregateSchema)

export const Video = mongoose.model("Video", videoSchema);