const express = require('express');
const controller = require('../controller/user');
const authenticateToken = require('../middleware/authentication');
const router = express.Router();

//** ROUTES TO ENDPOINTS */

//CRUD ROUTES
router.post('/', controller.createUser);
router.get('/getUser', authenticateToken, controller.getUser); 
router.get('/', controller.getAllUsers); 
router.put('/UpdateUser', authenticateToken, controller.updateUser);
router.delete('/:id', controller.deleteUser);
router.delete('/', controller.deleteAllUsers);

//ROUTE FOR OTHER ENDPOINTS
router.get('/verifyemail/:token', controller.verifyEmailUpdate);
router.post('/verifyOTP', authenticateToken, controller.verifyOTP);
router.post('/resendOTP', authenticateToken, controller.resendOTP);
router.post('/login', controller.loginUser);
router.post('/logout', authenticateToken, controller.logoutUser);
router.post('/forgotPassword', controller.forgotPassword);
router.get('/resetPassword/:token', controller.resetPassword);
router.post('/resendVerificationLink', authenticateToken, controller.resendVerificationLink);
router.post('/addMostlyWear', authenticateToken, controller.addMostlyWear);
router.post('/addPreferredSM', authenticateToken, controller.addPreferredSM);
router.post('/addMenMeasurement', authenticateToken, controller.addMenMeasurement);
router.post('/jwtrefreshtoken', controller.refreshJWTToken);



module.exports = router;