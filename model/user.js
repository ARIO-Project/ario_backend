const mongoose = require('mongoose');
const MenMeasurementSchema = require('./menmeasurement');

//USER ENTITY
const User = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    Firstname: { type: String, required: true },
    Lastname: { type: String, required: true },
    Email: { type: String, required: true },
    Password: { type: String, required: true },
    PhoneNumber: { type: String, required: false},
    PreferredSM: { 
        type: String, 
        required: false, 
        enum: [ 'WhatsApp', 'Instagram', 'Snapchat', 'Telegram', 'Twitter'],
        default: 'WhatsApp'
    },
    SMUsername: { type: String, required: false },
    MenMeasurement: {
        type: MenMeasurementSchema,
        required: false
    },
    MostlyWears: { type: [String], default: []},
    Note: {type: String, required: false},
    DeliveryAddress: { type: String, required: false },
    State: {type: String, required: false},
    DateCreated:{type: Date, default: Date.now },
    LastLogin:{type: Date, default: null },
    AccountUpdatedTime:{type: Date, default: Date.now},

    //ACCOUNT VERIFYING AND RESET ENTITIES
    isNewEmailVerified: {type: Boolean, default: null},
    OTP: {type: String},
    isOTPVerified: { type: Boolean, default: false },
    OTPCreatedAt: { type: Date, default: Date.now },
    ResetToken: {type: String},
    ResetTokenCreatedAt: { type: Date, default: null },
    JWTRefreshToken: { type: String }

});

module.exports = mongoose.model('User', User);