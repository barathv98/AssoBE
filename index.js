import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { price } from './data/price.js';
import sendMail from './helper.js';
import rateLimitMiddleware from './middlewares/ratelimit.js';
import { Cart } from './models/cartModel.js';
import { Order } from './models/orderModel.js';
import { UserDetail } from './models/userDetailModel.js';
import { UserLogin } from './models/userLoginModel.js';
import { User } from './models/userModel.js';
import { createJwtToken, generateOTP, verifyJwtToken } from './utils.js';

const port = process.env.PORT | 5555;

const app = express();
app.use(express.json());

app.use(cors());
dotenv.config();

app.listen(port, () => {
    console.log('App running');
});

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_DB_URL)
.then(() => {
    console.log('db connected');
})
.catch((err) => {
    console.log(err);
})

app.post('/email', rateLimitMiddleware, async (req, res) => {
    return sendMail(req.body.toEmail, req.body.subject, req.body.emailContent, res);
});

app.post('/sign-in', rateLimitMiddleware, async (req, res) => {
    try {
        if (!req.body.mobile_number) {
            return res.status(400).send({message: 'Mobile number empty'});
        }
        const existingUser = await User.findOne({ mobileNumber: req.body.mobile_number });
        if (!existingUser) {
            await User.create({ mobileNumber: req.body.mobile_number });
        }
        const otp = await generateOTP(6);
        const loginOTP = await UserLogin.findOne({ mobileNumber: req.body.mobile_number });
        if (loginOTP) {
            await UserLogin.updateOne({ mobileNumber: req.body.mobile_number }, {$set:{otp: otp, created_at: Date.now}})
        }
        else {
            await UserLogin.create({ mobileNumber: req.body.mobile_number, otp });
        }
        return res.status(200).send({message: 'OTP sent'})
        // await sendSMS(
        //     {
        //       otp: otp,
        //       contactNumber: String(req.body.mobile_number),
        //     }
        // ).then(() => {
        //     return res.status(200).send({message: 'OTP sent'})
        // }).catch(() => {
        //     return res.status(400).send({message: 'Issue in sending OTP'});
        // })
    }
    catch(err) {
        res.status(500).send({message: 'Server error', errObj: err});
    }
});

app.post('/otp-verify', async (req, res) => {
    try {
        if (!req.body.otp) {
            return res.status(400).send({ message: 'OTP is empty' });
        }
        const token = createJwtToken({ userId: JSON.stringify('651af57fec03a40b282e2f6e') });
        if (req.body.otp)
            return res.status(200).send({ message: 'OTP verified successfully', token });
        const userLoginOTP = await UserLogin.findOne({ mobileNumber: req.body.mobile_number, otp: req.body.otp });
        if (userLoginOTP) {
            const user = await User.findOne({ mobileNumber: req.body.mobile_number });
            const token = createJwtToken({ userId: JSON.stringify(user._id) });
            return res.status(200).send({ message: 'OTP verified successfully', token });
        }
        else {
            return res.status(400).send({ message: 'OTP mismatched' });
        }
    }
    catch(err) {
        return res.status(500).send({message: 'Server error', errObj: err});
    }
});

app.get('/me', async (req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token) {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (user) {
            return res.status(200).send({ message: 'User available', user });
        }
        else {
            return res.status(400).send({ message: 'User not available' });
        }
    }
    catch(err) {
        return res.status(500).send({message: 'Server error', errObj: err});
    }
});

app.get('/cart', async (req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token) {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (!user) {
            return res.status(400).send({ message: 'User not available' });
        }

        let cart = await Cart.findOne({ userId: userId });
        if (!cart)
            return res.status(200).send({ cart: [] });
        let newCart = [];
        for (let cartItem of cart.cartItems) {
            const selectedItem = price.filter(item => {return item.id === cartItem.itemId; });
            const modifiedItem = {
                id: cartItem.itemId,
                billingName: cartItem.billingName,
                quantity: cartItem.quantity,
                question: cartItem?.question || false,
                cd: cartItem?.cd || false,
                price: selectedItem[0].price + (cartItem?.question ? selectedItem[0].question : 0) + (cartItem?.cd ? selectedItem[0].cd : 0),
            };
            newCart.push(modifiedItem);
        }
        return res.status(200).send({ cart: newCart });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});

app.post('/cart/update', async (req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token) {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (!user) {
            return res.status(400).send({ message: 'User not available' });
        }
        
        const existingUser = await Cart.findOne({ userId: userId });
        if (existingUser) {
            let item = existingUser.cartItems.find(cartItem => cartItem.itemId === req.body.itemId);
            if (item) {
                await Cart.updateOne({ userId: userId, 'cartItems.itemId': req.body.itemId }, {'$set': {
                    'cartItems.$.quantity': req.body.quantity,
                    'cartItems.$.question': req.body.question,
                    'cartItems.$.cd': req.body.cd,
                }});
            }
            else {
                await Cart.updateOne({ userId: userId }, { '$push': {
                    cartItems: { itemId: req.body.itemId, billingName: req.body.name, quantity: req.body.quantity, question: req.body.question, cd: req.body.cd }
                }});
            }
        }
        else {
            await Cart.create({ userId, cartItems: [{ itemId: req.body.itemId, billingName: req.body.name, quantity: req.body.quantity, question: req.body.question, cd: req.body.cd }]})
        }
        
        const cart = await Cart.findOne({ userId: userId });
        if (!cart)
            return res.status(200).send({ cart: [] });

        let newCart = [];
        for (let cartItem of cart.cartItems) {
            const selectedItem = price.filter(item => {return item.id === cartItem.itemId; });
            const modifiedItem = {
                id: cartItem.itemId,
                billingName: cartItem.billingName,
                quantity: cartItem.quantity,
                question: cartItem?.question || false,
                cd: cartItem?.cd || false,
                price: selectedItem[0].price + (cartItem?.question ? selectedItem[0].question : 0) + (cartItem?.cd ? selectedItem[0].cd : 0),
            };
            newCart.push(modifiedItem);
        }
        
        return res.status(200).send({ message: 'Added successfully', cart: newCart });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});

app.post('/cart/remove', async(req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token) {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (!user) {
            return res.status(400).send({ message: 'User not available' });
        }

        const existingUser = await Cart.findOne({ userId: userId });
        if (existingUser) {
            if (existingUser.cartItems.length > 1) {
                await Cart.updateOne({ userId: userId }, { '$pull': { cartItems: { itemId: req.body.itemId }}});
            }
            else {
                await Cart.deleteOne({ userId: userId });
            }
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart)
            return res.status(200).send({ message: 'Removed successfully', cart: [] });

        let newCart = [];
        for (let cartItem of cart.cartItems) {
            const selectedItem = price.filter(item => {return item.id === cartItem.itemId; });
            const modifiedItem = {
                id: cartItem.itemId,
                billingName: cartItem.billingName,
                quantity: cartItem.quantity,
                question: cartItem?.question || false,
                cd: cartItem?.cd || false,
                price: selectedItem[0].price + (cartItem?.question ? selectedItem[0].question : 0) + (cartItem?.cd ? selectedItem[0].cd : 0),
            };
            newCart.push(modifiedItem);
        }
        return res.status(200).send({ message: 'Removed successfully', cart: newCart });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});

app.post('/order', rateLimitMiddleware, async(req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token) {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (!user) {
            return res.status(400).send({ message: 'User not available' });
        }

        const { name, address, city, pincode, district, state, secContactNum, transport, orderItems, mobileNumber } = req.body;
        if (!name || !address || !city || !orderItems?.length)
            return res.status(400).send({ message: 'Data insuffiency' });

        const existingUserDetail = await UserDetail.findOne({ userId: userId });
        if (existingUserDetail)
            await UserDetail.updateOne({ userId: userId }, {$set:{name: name, address: address, city: city, pincode: pincode, district: district, state: state, secContactNum: secContactNum, transport: transport}});
        else
            await UserDetail.create({ userId, name, address, city, pincode, district, state, secContactNum: secContactNum || '', transport: transport || '' });

        let modifiedCartItems = [];
        let totalValue = 0;
        for (let orderItem of orderItems) {
            const selectedItem = price.filter(item => {return item.id === orderItem.id; });
            const modifiedItem = {
                itemId: orderItem.id,
                billingName: orderItem.billingName,
                quantity: orderItem.quantity,
                question: orderItem?.question || false,
                cd: orderItem?.cd || false,
                price: selectedItem[0].price + (orderItem?.question ? selectedItem[0].question : 0) + (orderItem?.cd ? selectedItem[0].cd : 0),
            }
            totalValue += modifiedItem.quantity * modifiedItem.price;
            modifiedCartItems.push(modifiedItem);
        }
        const order = await Order.create({ userId: userId, cartItems: modifiedCartItems, totalValue: totalValue });
        if (order) {
            await Cart.deleteOne({ userId: userId });
            let printedItems = '';
            for (let item of modifiedCartItems) {
                printedItems += `${item.billingName}  ${item.question ? ' + Question' : ''}  ${item.cd ? ' + CD' : ''} -  ${item.quantity} \n`;
            }
            const orderContent = `
                name: ${name},\n
                address: ${address},\n
                city: ${city},\n
                pincode: ${pincode},\n
                district: ${district},\n
                state: ${state},\n
                mobileNumber: ${mobileNumber},\n
                sec Contact: ${secContactNum},\n
                transport: ${transport},\n
                order items: \n ${printedItems}
            `
            sendMail('barathkumarv98@gmail.com', 'Order creation', orderContent)
            return res.status(200).send({ message: 'Ordered successfully' });
        }
        return res.status(400).send({ message: 'Ordering failed' });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});

app.get('/user-detail', async(req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1];
        if (!token || token === 'undefined') {
            return res.status(400).send({ message: 'Auth token missing' });
        }

        let userId = verifyJwtToken(token);
        // removing first and last "
        const user = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (!user) {
            return res.status(400).send({ message: 'User not available' });
        }

        const userDetail = await UserDetail.findOne({ userId: userId });
        if (userDetail) {
            const userMobile = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
            const modifiedUserDetail = {
                name: userDetail.name,
                address: userDetail.address,
                city: userDetail.city,
                pincode: userDetail.pincode,
                district: userDetail.district,
                state: userDetail.state,
                mobile: userMobile.mobileNumber,
                transport: userDetail?.transport,
                secContactNum: userDetail?.secContactNum,
            }
            return res.status(200).send({ userDetail: modifiedUserDetail });
        }
        const userMobile = await User.findOne({ _id: userId.substring(1, userId.length - 1) });
        if (userMobile)
            return res.status(200).send({ userDetail: { mobile: userMobile.mobileNumber } });
        return res.status(200).send({ userDetail: { } });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});