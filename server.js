require('dotenv').config();
const http = require('http');
const express = require("express");
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

//PORT CONFIGURAION
const port = process.env.PORT || 3000;
const server = http.createServer(app);

//APP CONFIGURATION
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//DATABASE CONFIGURATION
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tlsInsecure: true
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// ROOT ROUTE
app.get('/', (req, res) => {
    res.send('Welcome to the ARIO AMBASSADOR SERVER');
});

//ROUTE TO "USER ROUTE" FILE
const UserRoute = require('./routes/user');
const StyleRoute = require('./routes/style');
const OrderRoute = require('./routes/order');

app.use('/users', UserRoute);

//API version 1

app.use('/api/v1', StyleRoute);
app.use('/api/v1', OrderRoute);


//SERVER RUNNING
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


