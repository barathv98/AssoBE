import express from "express";
import { PORT } from "./config.js";
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

const app = express();
app.listen(PORT, () => {
    console.log('App running');
});

app.use(cors());
dotenv.config();

app.get('/email', (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'barathkumarv98@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
        }
    });
      
    var mailOptions = {
        from: 'barathkumarv98@gmail.com',
        to: 'barathkumarv98@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            res.status(500);
        } else {
            res.status(200).send('email sent');
        }
    });

})
