const nodemailer = require('nodemailer');

// EMAIL TRANSPORTER SETUP
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "samuelbenibeh2@gmail.com",
        pass: "kepl weyw xirc zhiv"
    }
});

// VERIFYING TRANSPORTER
transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready to send messages");
        console.log(success);
    }
});

// UTILITY FUNCTION TO SEND EMAIL 
async function sendEmail({ to, subject, html }) {
    try {



        
        ///// I STILL HAVE TO CHANGE THIS EMAIL TO THE ONE FOR ARIO




        await transporter.sendMail({
            from: '"ARIO" <samuelbenibeh2@gmail.com>', 
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        throw new Error('Failed to send email');
    }
}

module.exports = sendEmail;
