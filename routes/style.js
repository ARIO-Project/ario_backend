const express = require('express');
const router = express.Router();
const styleController = require('../controller/style');
const authenticateToken = require('../middleware/authentication');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to add a new style (public or custom) - only authenticated users can add
router.post('/create-style', authenticateToken, upload.single('image'), styleController.addStyle);

// Route to get all styles (public and custom for the authenticated user)
router.get('/all-styles', authenticateToken, styleController.getStyles);

// Route to edit a user's custom style - only authenticated users can edit their own styles
router.put('/update-style/:styleId', authenticateToken, upload.single('image'), styleController.editCustomStyle);

// Route to delete a user's custom style - only authenticated users can delete their own styles
router.delete('/delete-style/:styleId', authenticateToken, styleController.deleteCustomStyle);

module.exports = router;
