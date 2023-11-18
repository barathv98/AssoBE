import mongoose from "mongoose";

const userDetailSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    pincode: {
        type: Number,
        required: true,
    },
    district: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    secContactNum: {
        type: String,
        required: false,
    },
    transport: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});

export const UserDetail = mongoose.model('userDetail', userDetailSchema);
