// cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = { cloudinary, upload };
