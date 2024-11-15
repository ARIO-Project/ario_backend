const mongoose = require('mongoose');

const styleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    isCustom: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // For custom styles associated with users
});

const Style = mongoose.model('Style', styleSchema);

module.exports = Style;
