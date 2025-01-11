const Order = require("../model/order");
const User = require("../model/user");
const Style = require("../model/style");
const TailorResponse = require("../model/tailorResponse");
const { sendCustomOrderEmail } = require('../middleware/email');


const waitForTailorResponses = async (orderId) => {
    const TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const startTime = Date.now();

    while (Date.now() - startTime < TIMEOUT) {
        const responses = await TailorResponse.find({ orderId }).lean();

        // Filter for accepted responses with prices
        const acceptedResponses = responses.filter(response => response.response === 'yes' && response.price);

        if (acceptedResponses.length > 0) {
            return acceptedResponses;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
    }

    return [];
};




// Order Controller
const orderController = {
  // Create a new order
  createOrder: async (req, res) => {
    try {
      const { fabricStyle, preferences, fabricType, comments } = req.body;
      const user = req.user.userId;

      // Check if the provided fabric style exists
      const style = await Style.findById(fabricStyle);
      if (!style) {
        return res
          .status(404)
          .json({ success: false, message: "Fabric style not found" });
      }

      console.log("User", user);
      // Fetch the user's measurements
      const foundUser = await User.findById(user).populate("MenMeasurement");
      if (!foundUser) {
        return res
          .status(404)
          .json({ success: false, message: "User Measurement not found" });
      }

      // Create new order including user's measurements
      const newOrder = new Order({
        user,
        fabricStyle,
        preferences,
        fabricType,
        comments,
      });

      const savedOrder = await newOrder.save();
      if (style.isCustom === true) {
        console.log(savedOrder._id);
        const tailorEmails = process.env.TAILOR_EMAILS?.split(',') || [];
    
        if (tailorEmails.length === 0) {
            return res.status(500).json({ success: false, message: 'No tailor emails configured' });
        }
    
        // Send emails to tailors
        const emailPromises = tailorEmails.map(email => sendCustomOrderEmail(email, {
            orderId: savedOrder._id,
            styleImage: style.imageUrl,
            orderDetails: {
                fabricType,
                preferences,
                comments,
            },
        }));
    
        await Promise.all(emailPromises);
    
        // Wait for tailor responses
        const tailorResponses = await waitForTailorResponses(savedOrder._id);
    
        if (tailorResponses.length === 0) {
            return res.status(401).json({ success: false, message: 'No tailors available for this style' });
        }
    
        // Select the tailor with the lowest price
        const selectedTailor = tailorResponses.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));
    
        // Update the order with selected tailor details
        savedOrder.tailorEmail = selectedTailor.tailorEmail;
        savedOrder.price = selectedTailor.price;
        await savedOrder.save();
    
        return res.status(200).json({ success: true, message: 'Custom order accepted by a tailor', order: savedOrder });
    }
    

      res.status(201).json({ success: true, order: savedOrder });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Modify an existing order
  modifyOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId; // Assume req.user is populated with authenticated user's info
      const { fabricStyle, preferences, fabricType, comments } = req.body;

      // Check if fabric style exists, if provided
      if (fabricStyle) {
        const style = await Style.findById(fabricStyle);
        if (!style) {
          return res
            .status(404)
            .json({ success: false, message: "Fabric style not found" });
        }
      }

      // Ensure the order exists, is in a modifiable status, and belongs to the requesting user
      const order = await Order.findOne({
        _id: orderId,
        status: "pending",
        user: userId,
      });
      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Order not found, not modifiable, or you are not authorized to modify it",
          });
      }

      // Update the order
      order.fabricStyle = fabricStyle || order.fabricStyle;
      order.preferences = preferences || order.preferences;
      order.fabricType = fabricType || order.fabricType;
      order.comments = comments || order.comments;
      order.modifiedAt = Date.now();

      const updatedOrder = await order.save();
      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Track the order status
  getOrderStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId).populate(
        "fabricStyle",
        "title imageUrl"
      );

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }
      res.status(200).json({ success: true, status: order.status, order });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getOrderDetails: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId)
        .populate("user", "Firstname Lastname Email PhoneNumber MenMeasurement")
        .populate("fabricStyle", "title imageUrl");

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res
        .status(200)
        .json({ message: "Order details fetched successfully", order });
    } catch (error) {
      res.status(500).json({ message: "Error fetching order details", error });
    }
  },

  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.find()
        .sort({ modifiedAt: -1 })
        .populate("user", "Firstname Lastname")
        .populate("fabricStyle", "title imageUrl");

      res.status(200).json({ message: "Orders fetched successfully", orders });
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders", error });
    }
  },

  deleteOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId; // Assume req.user is populated with authenticated user's info

      // Ensure the order exists, is in a deletable status, and belongs to the requesting user
      const order = await Order.findOne({
        _id: orderId,
        status: "pending",
        user: userId,
      });
      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Order not found, not deletable, or you are not authorized to delete it",
          });
      }

      // Delete the order
      await Order.deleteOne({ _id: orderId });
      res
        .status(200)
        .json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  acceptTailorResponse: async (req, res) => {
    try {
        const { orderId, response, price, tailorEmail } = req.body;

        // Validate request data
        if (!orderId || !['yes', 'no'].includes(response)) {
            return res.status(400).json({ success: false, message: 'Invalid response or order ID' });
        }

        if (response === 'yes' && (price === undefined || price <= 0)) {
            return res.status(400).json({ success: false, message: 'Price must be provided and greater than 0 for an accepted order' });
        }

        // Check for existing response from the tailor
        const existingResponse = await TailorResponse.findOne({ orderId, tailorEmail });
        if (existingResponse) {
            return res.status(400).json({ success: false, message: 'Response already submitted' });
        }

        // Save new response
        const newResponse = new TailorResponse({
            orderId,
            tailorEmail,
            response,
            price: response === 'yes' ? price : undefined, // Include price only for "yes" responses
        });

        await newResponse.save();

        res.status(200).json({ success: true, message: 'Response recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
},

};

module.exports = orderController;
