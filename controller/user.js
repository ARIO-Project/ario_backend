require("dotenv").config();

const User = require('../model/user');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const sendEmail = require('../middleware/email');
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;



async function generateHashedOTP() { 
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10)
    return { otp , hashedOTP};
}


function isOTPExpired(user) {
    const otpAge = Date.now() - new Date(user.OTPCreatedAt).getTime();
    return otpAge > 2 * 60 * 60 * 1000;  
}

//VERIFICATION FUNCTIONS
function validatePassword(password) {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validatePhoneNumber(PhoneNumber) {
    return /^0\d{10}$/.test(PhoneNumber);
}

//EMAIL SENDING FUNCTIONS
async function generateEmailHTML(templateName, placeholders) {
    try {
        const filePath = path.join(__dirname, '../middleware/emailformat.html');
        let html = await fs.readFile(filePath, 'utf-8');


        Object.keys(placeholders).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, placeholders[key]);
        });

        return html;
    } catch (err) {
        console.error('Error reading HTML template', err);
        throw new Error('Could not generate email HTML');
    }
}

async function sendOTPEmail(user, otp) {
    const emailContent = await generateEmailHTML('generalEmailTemplate.html', {
        title: 'Your OTP Code 🔒',
        content: `Hi ${user.Firstname} 👋,<br><br> Welcome to ARIO,<br>Your OTP Code is: <strong>${otp}</strong>.<br>Btw, this link will expire in 2 hours 😉.<br><br>`
    });  
    await sendEmail({
        to: user.Email,
        subject: "Your OTP Code 🔒",
        html: emailContent
    });

}

async function sendNewsLetterEmail(user) {
    const emailContent = await generateEmailHTML('generalEmailTemplate.html', {
        title: 'Welcome ✨',
        content: `<strong>🎉 Thank You ${user.Firstname}, for Joining Ario! 🎉</strong><br><br>
            Thank you for signing up with Ario, the online tailoring platform that’s about to change the way you look at custom fashion!<br>
            With Ario, you can design exactly what you want—no settling for mass-produced clothes that don't quite hit the mark. Whether it’s a unique Ankara piece, sleek native wear, or something bold for an event, we’ve got you covered. 👗✨<br><br>
            And the best part? Ario doesn’t just work for you—it helps amazing tailors and designers get the shine they deserve. You get to discover talented artisans from Nigeria and beyond, giving you unique, custom fits without the hassle. 🙌💫<br><br>
            Let’s create something amazing together! 😎👚`
    });

    await sendEmail({
        to: user.Email,
        subject: "Welcome ✨",
        html: emailContent
    });
}

async function sendPasswordResetEmail(user, resetLink) {
    const emailContent = await generateEmailHTML('generalEmailTemplate.html', {
        title: 'Password Reset 🔒',
        content: `Hi ${user.Firstname} 👋,<br><br> You requested a password reset,<br>Please click the following link to reset your password: <a href="${resetLink}">Reset Password Link</a>.<br>Btw, this link will exipre in 2 hours 😉<br><br>`
    });

    await sendEmail({
        to: user.Email,
        subject: "Password Reset 🔒",
        html: emailContent
    });
}

async function sendVerificationEmail(updateData, verificationLink) {
    const emailContent = await generateEmailHTML('generalEmailTemplate.html', {
        title: 'Email Verification 🔒',
        content: `Hi ${updateData.Firstname} 👋,<br><br> Please verify your new email by clicking the following link: <a href="${verificationLink}">Email Verification Link</a>.<br>Btw, this link will exipre in 2 hours 😉.<br><br>`
    });

    await sendEmail({
        to: updateData.Email,
        subject: "Email Verification 🔒",
        html: emailContent
    });
}




//** MAIN ENDPOINTS */

// CRUD OPERATIONS
exports.createUser = async (req, res) => {
    try {

        const { Password, Email, PhoneNumber } = req.body;
        const { otp, hashedOTP } = await generateHashedOTP();

        if (!validatePassword(Password)) {
            return res.status(400).send({ message: "Password must be at least 8 characters long and contain both letters, numbers and special characters." });
        }

        if (PhoneNumber && !validatePhoneNumber(PhoneNumber)) {
            return res.status(400).send({ message: "Invalid Phone Number" });
        }

        if (!validateEmail(Email)) {
            return res.status(400).send({ message: "Invalid email format" });
        }

        const searchConditions = [{ Email }];
        if (PhoneNumber) {
            searchConditions.push({ PhoneNumber });
        }
        let user = await User.findOne({ $or: searchConditions }).exec();
        // let user = await User.findOne({ $or: [{ Email }, { PhoneNumber }] }).exec();

        if (user) {
            
            if (user.Email === Email) {

                if (isOTPExpired(user)) {
                    user.OTP = hashedOTP;
                    user.OTPCreatedAt = Date.now();
                    await user.save();
                    await sendOTPEmail(user, otp);
                    return res.status(400).send({ message: "OTP has expired. A new OTP has been sent to your email.", otp: hashedOTP });
                } 

                else {
                    return res.status(400).send({ message: "User with this email already exists and OTP is still valid." });
                }
            } 

            else if (user.PhoneNumber === PhoneNumber) {
                return res.status(400).send({ message: "User with this phone number already exists." });
            }
        }

        user = new User({
            _id: new mongoose.Types.ObjectId(),
            OTP: hashedOTP,
            OTPCreatedAt: Date.now(),
            Firstname: req.body.Firstname,
            Lastname: req.body.Lastname,
            Email,
            Password: await bcrypt.hash(req.body.Password, 10),
            PhoneNumber,
            State: req.body.State
        });

        if ((!user.State)||user.State.toLowerCase() === "lagos") {
            const jwtToken = jwt.sign(
                { userId: user._id, email: user.Email }, 
                jwtSecret, 
                { expiresIn: '1h' } 
            );
            const jwtrefreshToken = jwt.sign(
                { userId: user._id }, 
                jwtRefreshSecret, 
                { expiresIn: '7d' }
            );
            user.JWTRefreshToken = jwtrefreshToken;
            await user.save();
            await sendOTPEmail(user, otp);
            return res.status(200).send({ message: "User created successfully", OTP: user.OTP, token: jwtToken, refreshToken: jwtrefreshToken });
        } 

        else {
            return res.status(400).send({ message: "We don't operate in your state" });
        }

    } catch (error) {

        return res.status(400).send(error.message);
    }
}

exports.getUser = async (req, res) =>{
    try{
        const UserId = req.user.userId;
        const user = await User.findById(UserId).exec();

        if(user){
            return res.status(200).json({
                user:{
                    Firstname: user.Firstname,
                    Lastname: user.Lastname,
                    Email: user.Email,
                    PhoneNumber: user.PhoneNumber,
                    PreferredSM: user.PreferredSM,
                    SMUsername: user.SMUsername,
                    MenMeasurement: user.MenMeasurement,
                    MostlyWears: user.MostlyWears
                }
            });
        }

        else{
            return res.status(404).send("User not found");
        }

    }
    catch(error){

        return res.status(400).send(error.message);
    }
}

exports.getAllUsers = async (req, res) =>{
    try{

        const users = await User.find();

        if(users.length === 0){
            return res.status(404).send("No user in database");
        }

        else{
            return res.status(200).json({users});
        }
    }
    catch(error){

        return res.status(400).send(error.message);
    }
}

exports.updateUser = async (req, res) => {
    try {
        const UserId = req.user.userId;
        const user = await User.findById(UserId).exec();

        if (!user) {
            return res.status(404).send("User not found");
        }

        if (!user.isOTPVerified) {
            return res.status(400).send("OTP is not verified");
        }

        const {
            Firstname,
            Lastname,
            Email,
            Password,
            PhoneNumber,
            PreferredSM,
            SMUsername,
            MenMeasurement,
            MostlyWears,
            DeliveryAddress,
            State
        } = req.body;

        const validSMOptions = ['WhatsApp', 'Instagram', 'Snapchat', 'Telegram', 'Twitter'];
        if (PreferredSM && !validSMOptions.includes(PreferredSM)) {
            return res.status(400).send({ message: "Invalid Preferred Social Media option" });
        }
        
        if (Password && !validatePassword(Password)) {
            return res.status(400).send({ message: "Password must be at least 8 characters long and contain both letters and numbers." });
        }

        if (PhoneNumber && !validatePhoneNumber(PhoneNumber)) {
            return res.status(400).send({ message: "Invalid Phone Number format." });
        }

        if (Email && !validateEmail(Email)) {
            return res.status(400).send({ message: "Invalid email format" });
        }

        const updateData = {
            ...(Firstname && { Firstname }),
            ...(Lastname && { Lastname }),
            ...(Email && { Email }),
            ...(PhoneNumber && { PhoneNumber }),
            ...(PreferredSM && { PreferredSM }),
            ...(SMUsername && { SMUsername }),
            ...(MenMeasurement && { MenMeasurement }),
            ...(MostlyWears && { MostlyWears }),
            ...(DeliveryAddress && { DeliveryAddress }),
            ...(State && { State }),
            AccountUpdatedTime: Date.now()
        };


        if(Email && Email !== user.Email ){
            
            if (await User.findOne({ Email }).exec()) {
                return res.status(400).send({ message: "Email is already in use" });
            }

            updateData.ResetToken = crypto.randomBytes(32).toString('hex');
            updateData.isNewEmailVerified = false;
            updateData.ResetTokenCreatedAt = Date.now();
            await User.findByIdAndUpdate(UserId, updateData, { new: true }).exec();
            const verificationLink = `http://localhost:3000/users/verifyemail/${updateData.ResetToken}`;            
            await sendVerificationEmail(updateData, verificationLink);
            return res.status(200).json({ message: "Please click the link sent to new email to verify the email" });
        }
        
        if (PhoneNumber && PhoneNumber !== user.PhoneNumber){

            if (await User.findOne({ PhoneNumber }).exec()) {
                return res.status(400).send({ message: "Phone number is already in use" });
            }
        }

        if (Password) {
            updateData.Password = await bcrypt.hash(Password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(UserId, updateData, { new: true }).exec();
        return res.status(200).json({ 
            message: "User updated successfully", 
            user: {
                Firstname: updatedUser.Firstname,
                Lastname: updatedUser.Lastname,
                Email: updatedUser.Email,
                PhoneNumber: updatedUser.PhoneNumber,
                PreferredSM: updatedUser.PreferredSM,
                SMUsername: updatedUser.SMUsername,
                MenMeasurement: updatedUser.MenMeasurement,
                MostlyWears: updatedUser.MostlyWears
            } 
        });

    } catch (error) {

        return res.status(400).send(error.message);
    }
}

exports.deleteUser = async (req, res) => {
    try {
        const UserId = req.params.id;
        const user = await User.findById(UserId).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        await User.findByIdAndDelete(UserId).exec();
        return res.status(200).send({ message: "User deleted successfully" });

    } catch (error) {
        
        return res.status(400).send({ message: error.message });
    }
}

exports.deleteAllUsers = async (req, res) => {
    try {
        const result = await User.deleteMany({});

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "No users to delete" });
        }

        return res.status(200).send({ message: "All users deleted successfully", deletedCount: result.deletedCount });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}




//** OTHER ENDPOINTS */

// VERIFYING UPDATED EMAIL
exports.verifyEmailUpdate = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({ ResetToken: token }).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        if ((Date.now() - new Date(user.ResetTokenCreatedAt).getTime()) > (2 *60 * 60 * 1000)) {
            user.ResetToken = crypto.randomBytes(32).toString('hex');
            user.ResetTokenCreatedAt = Date.now();
            user.isNewEmailVerified = false;
            await user.save();
            const verificationLink = `http://localhost:3000/users/verifyemail/${user.ResetToken}`;
            await sendVerificationEmail(user, verificationLink);
            return res.status(400).send({ message: "Token expired. A new verification link has been sent to your email." });
        }

   
        if (user.ResetToken === token) {
            user.isNewEmailVerified = true;
            user.ResetToken = null;
            user.ResetTokenCreatedAt = null;
            await user.save();
            return res.status(200).send({ message: "Email has been updated successfully" });
        } 

        else {
            return res.status(400).send({ message: "Invalid token" });
        }

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

//VERIFY USER OTP
exports.verifyOTP = async (req, res) => {
    try {
        const Email = req.user.email;
        const { OTP } = req.body;
        const user = await User.findOne({ Email }).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        if (user.isOTPVerified) {
            return res.status(400).send({ message: "User is already verified" });
        }

        if (isOTPExpired(user)) {
            const { otp, hashedOTP } = await generateHashedOTP();
            user.OTP = hashedOTP;
            user.OTPCreatedAt = Date.now();
            await user.save();
            await sendOTPEmail(user, otp);
            return res.status(400).send({ message: "OTP has expired. A new OTP has been sent.", hashedOTP });
        }

        if ((await bcrypt.compare(OTP, user.OTP))) {
            user.isOTPVerified = true;
            await sendNewsLetterEmail(user);
            await user.save();
            return res.status(200).send({ message: "OTP verified successfully" });
        } 

        else {
            return res.status(400).send({ message: "Invalid OTP" });
        }

    } catch (error) {

        return res.status(400).send(error.message);
    }
}

//RESENDING USER OTP
exports.resendOTP = async (req, res) => {
    try {
        const Email = req.user.email;
        const user = await User.findOne({ Email }).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const { otp, hashedOTP } = await generateHashedOTP();
        user.OTP = hashedOTP;
        user.OTPCreatedAt = Date.now();
        await user.save();
        await sendOTPEmail(user, otp);
        return res.status(200).send({ message: "OTP has been resent", OTP: hashedOTP });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

//LOGIN USERS
exports.loginUser = async (req, res) => {
    try {
        const { EmailorPhoneNumber, Password } = req.body;
        const user = await User.findOne({ 
            $or: [{ Email: EmailorPhoneNumber }, { PhoneNumber: EmailorPhoneNumber }]
        }).exec();

        if (!user) {
            return res.status(404).send({ message: "Incorrect Email or Phone Number" });
        }

        if (!user.isOTPVerified) {
            return res.status(400).send({ message: "OTP not verified. Please verify your OTP first." });
        }

        if ((await bcrypt.compare(Password, user.Password)) && user.isNewEmailVerified == false ) {
            user.LastLogin = Date.now();
            const token = crypto.randomBytes(32).toString('hex');
            user.ResetToken = token;
            user.ResetTokenCreatedAt = Date.now();
            // await user.save();
            const verificationLink = `http://localhost:3000/users/verifyemail/${token}`;
            await sendVerificationEmail(user, verificationLink);
            const jwtToken = jwt.sign(
                { userId: user._id, email: user.Email }, 
                jwtSecret, 
                { expiresIn: '1h' } 
            );
            const jwtrefreshToken = jwt.sign(
                { userId: user._id, email: user.Email }, 
                jwtRefreshSecret, 
                { expiresIn: '7d' }  
            );
            user.JWTRefreshToken = jwtrefreshToken;
            await user.save();
            return res.status(200).send({ message: "Please click the link sent to your new email to verify it.",
                user:{
                    Firstname: user.Firstname,
                    Lastname: user.Lastname,
                    Email: user.Email,
                    PhoneNumber: user.PhoneNumber,
                    PreferredSM: user.PreferredSM,
                    SMUsername: user.SMUsername,
                    MenMeasurement: user.MenMeasurement,
                    MostlyWears: user.MostlyWears
                }, token:jwtToken, refreshToken: jwtrefreshToken });
        }

        else if ((await bcrypt.compare(Password, user.Password)) && (user.isNewEmailVerified == true || user.isNewEmailVerified == null)) {
            user.LastLogin = Date.now();
            await user.save();
            const jwtToken = jwt.sign(
                { userId: user._id, email: user.Email }, 
                jwtSecret, 
                { expiresIn: '1h' }  
            );
            const jwtrefreshToken = jwt.sign(
                { userId: user._id }, 
                jwtRefreshSecret, 
                { expiresIn: '7d' }  
            );
            user.JWTRefreshToken = jwtrefreshToken;
            await user.save();
            return res.status(200).send({ message: "Welcome back ",
                user:{
                    Firstname: user.Firstname,
                    Lastname: user.Lastname,
                    Email: user.Email,
                    PhoneNumber: user.PhoneNumber,
                    PreferredSM: user.PreferredSM,
                    SMUsername: user.SMUsername,
                    MenMeasurement: user.MenMeasurement,
                    MostlyWears: user.MostlyWears
                }, token: jwtToken, refreshToken: jwtrefreshToken  }); 
        }

        return res.status(400).send({ message: "Invalid password" });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

// LOGOUT USER
exports.logoutUser = async (req, res) => {
    try {
        const UserId = req.user.userId;
        const user = await User.findById(UserId).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        user.JWTRefreshToken = null;
        await user.save();
        return res.status(200).send({ message: "User logged out successfully" });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
    try {
        const { Email } = req.body;
        const user = await User.findOne({ Email }).exec();

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.ResetToken = resetToken;
        user.ResetTokenCreatedAt = Date.now()
        await user.save();
        const resetLink = `http://localhost:3000/users/resetPassword/${resetToken}`;
        await sendPasswordResetEmail(user, resetLink);
        return res.status(200).send({ message: "Password reset link has been sent to your email" });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

// RESET USER PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const  { newPassword } = req.body;

        if (!validatePassword(newPassword)) {
            return res.status(400).send({ message: "Password must be at least 8 characters long and contain both letters and numbers." });
        }

        const user = await User.findOne({
            ResetToken: token,
            ResetTokenCreatedAt: { $gt: Date.now() - 7200000 }
        }).exec();

        if (!user) {
            return res.status(400).send({ message: "Invalid or expired token" });
        }

        user.Password = await bcrypt.hash(newPassword, 10);
        user.ResetToken = null;
        user.ResetTokenCreatedAt = null;
        await user.save();
        return res.status(200).send({ message: "Password has been reset successfully" });

    } catch (error) {

        return res.status(400).send({ message: error.message });
    }
}

//RESEND VERIFICATION LINK TO USERS
exports.resendVerificationLink = async (req, res) => {
    try {

        const { Email } = req.body;
        const user = await User.findOne({ Email }).exec();

        if (!user) {
            return res.status(404).send({ message: "Email not found" });
        }

        if (user.isNewEmailVerified == false ) {
            const token = crypto.randomBytes(32).toString('hex');
            user.ResetToken = token;
            user.ResetTokenCreatedAt = Date.now();
            await user.save();
            const verificationLink = `http://localhost:3000/users/verifyemail/${token}`;
            await sendVerificationEmail(user, verificationLink);
            return res.status(200).send({ message: "Verification link resent successfully" });  
        }

        return res.status(400).send({ message: "Email is already verified" });

    } catch (error) {

        return res.status(500).send({ message: error.message });
    }
}

//MOSTLY WEARS
exports.addMostlyWear = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { selectedWear } = req.body;
        const user = await User.findById(userId).exec();

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        if (!user.MostlyWears) {
            user.MostlyWears = [];
        }else{
            user.MostlyWears = user.MostlyWears.filter(wear => wear);
        }

        if (Array.isArray(selectedWear)) {
            user.MostlyWears.push(...selectedWear);
        } else {
            user.MostlyWears.push(selectedWear);
        }

        await user.save();
        return res.status(200).send({ message: 'MostlyWears updated successfully', user });

    } catch (error) {

        return res.status(500).send({ message: error.message });
    }
}

exports.addPreferredSM = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { PreferredSM, SMUsername } = req.body;

        const validSMOptions = ['WhatsApp', 'Instagram', 'Snapchat', 'Telegram', 'Twitter'];
        if (!validSMOptions.includes(PreferredSM)) {
            return res.status(400).send({ message: "Invalid Preferred Social Media option" });
        }

        const user = await User.findById(userId).exec();

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        user.PreferredSM = PreferredSM;
        user.SMUsername = SMUsername;
        await user.save();

        return res.status(200).send({ message: 'Preferred Social Media selected successfully', user });

    } catch (error) {
        
        return res.status(500).send({ message: error.message });
    }
}

exports.addMenMeasurement = async (req, res) => {
    try {
        const userId = req.user.userId;
        const menMeasurement = req.body;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }


        user.MenMeasurement = menMeasurement;
        await user.save();

        return res.status(200).json({
            message: "Men's measurement added successfully",
            data: user.MenMeasurement
        });

    } catch (error) {

        return res.status(500).send({ message: error.message });
    }
}

// REFRESH ACCESS TOKEN
exports.refreshJWTToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).send({ message: "Refresh token required" });
        }

        jwt.verify(refreshToken, jwtRefreshSecret, async (err, decoded) => {

            if (err) {
                return res.status(403).send({ message: "Invalid or expired refresh token" });
            }

            const user = await User.findById(decoded.userId).exec();
            if (!user || user.JWTRefreshToken !== refreshToken) {
                return res.status(403).send({ message: "Invalid refresh token" });
            }

            const newToken = jwt.sign(
                { userId: user._id, email: user.Email }, 
                jwtSecret, 
                { expiresIn: '1h' }
            );
            const newRefreshToken = jwt.sign(
                { userId: user._id }, 
                jwtRefreshSecret, 
                { expiresIn: '7d' }
            );

            user.JWTRefreshToken = newRefreshToken;
            await user.save();
            return res.status(200).send({ message: "Token refreshed", token: newToken });
        });

    } catch (error) {

        return res.status(500).send({ message: error.message });
    }
}

