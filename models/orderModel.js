import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    cartItems: [
        {
            itemId: {
                type: Number,
                required: true,
            },
            billingName: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            question: {
                type: Boolean,
                required: true,
            },
            cd: {
                type: Boolean,
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
        },
    ],
    totalValue: {
        type: Number,
        required: true,
    }
}, {
    timestamps: true,
});

export const Order = mongoose.model('order', orderSchema);
