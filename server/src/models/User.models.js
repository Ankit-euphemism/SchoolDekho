import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },

        passwordHash: {
            type: String,
            required: [true, "Password is required"],
        },

        role: {
            type: String,
            enum: ["parent", "school-admin"],
            default: "parent",
        },

        // Only relevant when role === "school-admin"
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            default: null,
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
