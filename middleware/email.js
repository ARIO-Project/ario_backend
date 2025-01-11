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


const sendCustomOrderEmail = async (email, { orderId, styleImage, orderDetails }) => {
    try {
        

        const mailOptions = {
            from: '"ARIO" <your-email@example.com>', // Update with the correct email
            to: email,
            subject: `New Custom Order Request: Order ID ${orderId}`,
            html: `
                <h1>New Custom Order Request</h1>
                <p>Order ID: ${orderId}</p>
                <p><b>Fabric Type:</b> ${orderDetails.fabricType}</p>
                <p><b>Preferences:</b> ${orderDetails.preferences}</p>
                <p><b>Comments:</b> ${orderDetails.comments}</p>
                <p>Style Image:</p>
                <img src="${styleImage}" alt="Style Image" style="max-width: 100%; height: auto;" />
                <p>Please respond by clicking the appropriate link below:</p>
                <a href="${process.env.FRONTEND_URL}/tailors/response?orderId=${orderId}&response=yes">Accept</a> |
                <a href="${process.env.FRONTEND_URL}/tailors/response?orderId=${orderId}&response=no">Decline</a>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        throw new Error('Failed to send email');
    }
};


module.exports = {
    sendEmail,
    sendCustomOrderEmail
};

