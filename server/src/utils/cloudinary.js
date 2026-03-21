import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
// import fs from "fs";

const CLOUDINARY_UPLOAD_FOLDER = "server/school_photos";

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image uploads are allowed."));
            return;
        }
        cb(null, true);
    },
});

function uploadBufferToCloudinary(fileBuffer, mimetype) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: CLOUDINARY_UPLOAD_FOLDER,
                resource_type: "image",
                format: mimetype === "image/png" ? "png" : undefined,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            },
        );

        uploadStream.end(fileBuffer);
    });
}

function getCloudinaryPublicIdFromUrl(photoUrl) {
    if (!photoUrl || typeof photoUrl !== "string") return null;

    const escapedFolder = CLOUDINARY_UPLOAD_FOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = decodeURIComponent(photoUrl).match(
        new RegExp(`/${escapedFolder}/[^?#]+`, "i")
    );

    if (!match?.[0]) return null;

    // Strip leading slash and file extension from Cloudinary URL path.
    const pathWithoutLeadingSlash = match[0].replace(/^\//, "");
    return pathWithoutLeadingSlash.replace(/\.[a-z0-9]+$/i, "");
}

async function deleteCloudinaryPhotoByUrl(photoUrl) {
    const publicId = getCloudinaryPublicIdFromUrl(photoUrl);
    if (!publicId) {
        return { status: "skipped", reason: "not-a-cloudinary-school-photo-url", photoUrl };
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    return { status: result?.result || "unknown", publicId, photoUrl };
}

async function deleteCloudinaryPhotosByUrls(photoUrls = []) {
    const uniqueUrls = Array.from(new Set((photoUrls || []).filter(Boolean)));
    return Promise.allSettled(uniqueUrls.map((url) => deleteCloudinaryPhotoByUrl(url)));
}

export {
    cloudinary,
    upload,
    uploadBufferToCloudinary,
    getCloudinaryPublicIdFromUrl,
    deleteCloudinaryPhotoByUrl,
    deleteCloudinaryPhotosByUrls,
};