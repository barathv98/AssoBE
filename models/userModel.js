import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    mobileNumber: {
        type: String,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});

export const User = mongoose.model('user', userSchema);
