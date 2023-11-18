import mongoose from "mongoose";

const cartSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
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
        },
    ]
}, {
    timestamps: true,
});

export const Cart = mongoose.model('cart', cartSchema);
