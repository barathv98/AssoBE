import mongoose from "mongoose";

const userLoginSchema = mongoose.Schema({
    mobileNumber: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300,
    },
}, {
    timestamps: true,
});

export const UserLogin = mongoose.model('userLogin', userLoginSchema);
