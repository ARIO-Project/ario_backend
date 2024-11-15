const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user placing the order
    fabricStyle: { type: mongoose.Schema.Types.ObjectId, ref: 'Style', required: true }, // Reference to selected fabric style
    preferences: {
        color: { type: String },
        sleeveLength: { type: String, enum: ['short sleeve', 'long sleeve'] },
    },
    fabricType: { 
        type: String, 
        enum: ['cotton', 'silk', 'linen', 'polyester'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'in progress', 'completed', 'delivered'], 
        default: 'pending' 
    }, // Track the order status
    createdAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date },
    comments: { type: String } // Allow users to add extra comments to their orders
});

module.exports = mongoose.model('Order', orderSchema);
