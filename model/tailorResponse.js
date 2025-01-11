const mongoose = require('mongoose');

const TailorResponseSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    tailorEmail: { type: String, required: true },
    response: { type: String, enum: ['yes', 'no'], required: true },
    price: { type: Number }, // Price field, optional for "no" responses
}, { timestamps: true });

module.exports = mongoose.model('TailorResponse', TailorResponseSchema);
