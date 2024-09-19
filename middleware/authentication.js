const jwtSecret = process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');


function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).send({ message: 'Access denied. No token provided.' });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Invalid JWT token.' });
        }

        req.user = decoded;
        next(); 
    });
}

module.exports = authenticateToken;