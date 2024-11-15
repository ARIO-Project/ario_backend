const express = require('express');
const router = express.Router();
const orderController = require('../controller/order'); 
const authenticateToken = require('../middleware/authentication');

// Create a new order
router.post('/create-order', authenticateToken, orderController.createOrder);

// Modify an existing order (accessible to all authenticated users)
router.put('/update-order/:orderId', authenticateToken, orderController.modifyOrder);


// Track the order status
router.get('/order-status/:orderId', authenticateToken, orderController.getOrderStatus);


// Get order details
router.get('/order-detail/:orderId', authenticateToken, orderController.getOrderDetails);

// Get all orders sorted by date modified
router.get('/all-orders', authenticateToken, orderController.getAllOrders);

// Get all orders sorted by date modified
router.delete('/delete-order/:orderId', authenticateToken, orderController.deleteOrder);

module.exports = router;
