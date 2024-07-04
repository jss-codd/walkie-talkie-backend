const jwt = require('jsonwebtoken');

const { Devices } = require("./db/model");
const { errorMessage } = require("./Constants");

const secret = 'truckaan-wale-secret-key-@$!!';
const secret_admin = 'truckaan-wale-secret-key-@$!!';

function generateAccessToken(user) {
    const payload = {
      id: user.id
    };
    
    const options = { expiresIn: '24h' };
  
    return jwt.sign(payload, secret, options);
}

function generateAccessTokenForAdmin(user) {
  const payload = {
    id: user.id
  };
  
  const options = { expiresIn: '24h' };

  return jwt.sign(payload, secret_admin, options);
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, secret);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function verifyAccessTokenForAdmin(token) {
  try {
    const decoded = jwt.verify(token, secret_admin);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  const result = verifyAccessToken(token);

  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }

  req.user = result.data;
  next();
}

function authenticateTokenForAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  const result = verifyAccessTokenForAdmin(token);

  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }

  req.user = result.data;
  next();
}

async function verifyAccount(req, res, next) {
  const resDevice = await Devices.findOne({ where: { id: req.user.id } });

  if(resDevice === null) {
    return res.status(404).json({ success: false, error: errorMessage.account404 });
  }

  if(resDevice.blocked === true) {
    return res.status(400).json({ success: false, error: errorMessage.blockedAccount });
  }

  req.resDevice = resDevice;
  
  next();
}

module.exports = { generateAccessToken, authenticateToken, generateAccessTokenForAdmin, authenticateTokenForAdmin, verifyAccount };