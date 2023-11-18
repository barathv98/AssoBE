import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Cart } from './models/cartModel.js';
import { User } from './models/userModel.js';
import { UserLogin } from './models/userLoginModel.js';
import { Order } from './models/orderModel.js';
import { generateOTP, createJwtToken, verifyJwtToken } from './utils.js';
import { price } from './data/price.js';
import { UserDetail } from './models/userDetailModel.js';

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

app.post('/email', (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'barathkumarv98@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
        }
    });
      
    var mailOptions = {
        from: 'barathkumarv98@gmail.com',
        to: req.body.toEmail,
        subject: req.body.subject,
        text: req.body.emailContent,
    };
      
    transporter.sendMail(mailOptions, function(error){
        if (error) {
            return res.status(500);
        } else {
            return res.status(200).send('email sent');
        }
    });
});

app.post('/sign-in', async (req, res) => {
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
        return res.status(200).send({message: 'OTP sent'});
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
        res.status(500).send({message: 'Server error'});
    }
});

app.post('/otp-verify', async (req, res) => {
    try {
        if (!req.body.otp) {
            return res.status(400).send({ message: 'OTP is empty' });
        }
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
        return res.status(500).send({message: 'Server error'});
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
        return res.status(500).send({message: 'Server error'});
    }
});

app.get('/cart', async (req, res) => {
    try {
        const header = req.headers.authorization
        if (!header) {
            return res.status(400).send({ message: 'Auth header missing' });
        }

        const token = header.split("Bearer ")[1]
        if (!token || token === undefined) {
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
                question: cartItem.question,
                cd: cartItem.cd,
                price: selectedItem[0].price + (cartItem.question && selectedItem[0].question) + (cartItem.cd && selectedItem[0].cd),
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
        
        console.time('latency');
        const cart = await Cart.findOne({ userId: userId });
        if (!cart)
            return res.status(200).send({ cart: [] });
        console.timeEnd('latency');
        let newCart = [];
        for (let cartItem of cart.cartItems) {
            const selectedItem = price.filter(item => {return item.id === cartItem.itemId; });
            const modifiedItem = {
                id: cartItem.itemId,
                billingName: cartItem.billingName,
                quantity: cartItem.quantity,
                question: cartItem.question,
                cd: cartItem.cd,
                price: selectedItem[0].price + (cartItem.question && selectedItem[0].question) + (cartItem.cd && selectedItem[0].cd),
            };
            newCart.push(modifiedItem);
        }
        
        return res.status(200).send({ message: 'Added successfully', cart: newCart });
    }
    catch(err) {
        console.log('error', err);
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
                question: cartItem.question,
                cd: cartItem.cd,
                price: selectedItem[0].price + (cartItem.question && selectedItem[0].question) + (cartItem.cd && selectedItem[0].cd),
            };
            newCart.push(modifiedItem);
        }
        return res.status(200).send({ message: 'Removed successfully', cart: newCart });
    }
    catch(err) {
        return res.status(500).send({message: 'Server error'});
    }
});

app.post('/order', async(req, res) => {
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

        const { name, address, city, pincode, district, state, secContact, transport, orderItems } = req.body;
        if (!name || !address || !city || !orderItems?.length)
            return res.status(400).send({ message: 'Data insuffiency' });

        const existingUserDetail = await UserDetail.findOne({ userId: userId });
        if (existingUserDetail)
            await UserDetail.updateOne({ userId: userId }, {$set:{name: name, address: address, city: city, pincode: pincode, district: district, state: state, secContact}});
        else
            await UserDetail.create({ userId, name, address, city, pincode, district, state, secContact: secContact || '', transport: transport || '' });

        let modifiedCartItems = [];
        let totalValue = 0;
        for (let orderItem of orderItems) {
            const selectedItem = price.filter(item => {return item.id === orderItem.id; });
            const modifiedItem = {
                itemId: orderItem.id,
                billingName: orderItem.billingName,
                quantity: orderItem.quantity,
                question: orderItem.question,
                cd: orderItem.cd,
                price: selectedItem[0].price + (orderItem.question && selectedItem[0].question) + (orderItem.cd && selectedItem[0].cd),
            }
            totalValue += modifiedItem.quantity * modifiedItem.price;
            modifiedCartItems.push(modifiedItem);
        }
        const order = await Order.create({ userId: userId, cartItems: modifiedCartItems, totalValue: totalValue });
        if (order) {
            await Cart.deleteOne({ userId: userId });
            return res.status(200).send({ message: 'Ordered successfully' });
        }
        return res.status(400).send({ message: 'Ordering failed' });
    }
    catch(err) {
        console.log('err', err);
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