import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        type: {
            type: String,
            enum: ["primary", "secondary", "international"],
            required: [true, "School type is required"],
        },

        board: {
            type: String,
            enum: ["CBSE", "ICSE", "IB", "state"],
            required: [true, "Board is required"],
        },

        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },

        // GeoJSON Point — enables 2dsphere geospatial queries
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: [true, "Coordinates are required"],
            },
        },

        phone: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        website: {
            type: String,
            trim: true,
        },

        established: {
            type: Number, // year, e.g. 1998
        },

        fees: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 0 },
        },

        facilities: {
            type: [String],
            default: [],
        },

        // Cloudinary secure URLs
        photos: {
            type: [String],
            default: [],
        },

        virtualTourUrl: {
            type: String,
            trim: true,
        },

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        reviewCount: {
            type: Number,
            default: 0,
        },

        profileViews: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// ─── Geospatial Index ─────────────────────────────────────────────────────────
schoolSchema.index({ location: "2dsphere" });

// ─── Text Search Index ────────────────────────────────────────────────────────
schoolSchema.index({ name: "text", description: "text", address: "text" });

const School = mongoose.model("School", schoolSchema);

export default School;
