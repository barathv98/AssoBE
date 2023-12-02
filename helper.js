import nodemailer from 'nodemailer';

const sendMail = (toEmail, subject, emailContent, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'barathkumarv98@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
        }
    });
      
    var mailOptions = {
        from: 'barathkumarv98@gmail.com',
        to: toEmail,
        subject: subject,
        text: emailContent,
    };
      
    transporter.sendMail(mailOptions, function(error){
        if (error) {
            return res.status(500);
        } else {
            return res.status(200).send('email sent');
        }
    });
}

export default sendMail;
