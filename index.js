const express = require('express'); 
const app = express();
const http = require('http'); 
const server = http.createServer(app);
var cors = require('cors');
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const admin = require("firebase-admin");
const { QueryTypes } = require('sequelize');

const { getDeviceTokens } = require('./utils/Device');
const { getLocationInRadius } = require('./utils/Location');
const { Devices, Locations, Otp, Admin, ReportedUsers } = require("./utils/db/model");
const { SERVER_URL, errorMessage } = require("./utils/Constants");
const logger = require("./logger");
var serviceAccount = require("./serviceAccountKey.json");
const {sequelize} = require('./utils/db/config');
const { generateAccessToken, authenticateToken, generateAccessTokenForAdmin, authenticateTokenForAdmin, verifyAccount } = require('./utils/Token');
const validateResource = require('./utils/ValidateResource');
const validator = require('./utils/Validator');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = 5000;

const pinRetryCount = 5;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const fileStatic = 'https://onlinetestcase.com/wp-content/uploads/2023/06/100-KB-MP3.mp3';

app.get('/', (req, res) => { 
    res.send('ok'); 
});

app.use('/resources',express.static(__dirname + '/myuploads'));
app.use('/profile-images',express.static(__dirname + '/profile-images'));

// SET STORAGE
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
  let dir = `myuploads/`; // specify the path you want to store file
  //check if file path exists or create the directory
  fs.access(dir, function(error) {
    if (error) {
      console.log("Directory does not exist.");
      return fs.mkdir('myuploads', error => cb(error, dir));
    } else {
      console.log("Directory exists.");
      return cb(null, dir);
    }
  });
  },
    filename: function(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // added Date.now() so that name will be unique
  }
});
  
const uploadFiles = multer({ storage: storage });

// SET STORAGE FOR PROFILE IMAGE
const storageProfileImage = multer.diskStorage({
  destination: function(req, file, cb) {
  let dir = `profile-images/`; // specify the path you want to store file
  //check if file path exists or create the directory
  fs.access(dir, function(error) {
    if (error) {
      console.log("Directory does not exist.");
      return fs.mkdir('profile-images', error => cb(error, dir));
    } else {
      console.log("Directory exists.");
      return cb(null, dir);
    }
  });
  },
    filename: function(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // added Date.now() so that name will be unique
  }
});
  
const uploadProfileImage = multer({ storage: storageProfileImage });

app.post("/upload", authenticateToken, verifyAccount, uploadFiles.single("file"), async (req, res, next) => {
  try{
    const file = req.file;

    if (!file) {
      const error = new Error(errorMessage.uploadFile);
      error.statusCode = 400;
      logger.error(errorMessage.uploadFile, {route: req?.originalUrl});
      return next(error);
    }

    const bodyParse = JSON.parse(JSON.stringify(req.body));
    const location = JSON.parse(bodyParse?.location) || {};

    if(!location?.latitude || !location?.longitude) {
      throw new Error(errorMessage.positionError);
    }
    
    const tokens = await getLocationInRadius(location.latitude, location.longitude, req.resDevice.id);
    
    const tokensArray = tokens.map(d => d.token);

    console.log(tokensArray, 'tokensArray');

    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < tokensArray.length; i += batchSize) {
      batches.push(tokensArray.slice(i, i + batchSize));
    }

    const profile_img = req.resDevice.profile_img ? `${SERVER_URL}/${req.resDevice.profile_img}` : "";

    // Map batches to promises for concurrent processing
    const notifications = batches.map((batch) => {
      const message = {
        data: {
          user_name: req.resDevice.name || "unknown",
          id: `${req.resDevice.id}`,
          profileImage: `${profile_img}`,
          audio_url: `${SERVER_URL}/resources/${file.filename}`
          // audio_url: `${fileStatic}`
        },
        tokens: [...batch],
        notification: {
          "title": "Incoming audio from Truckaan Wale",
          "body": ""
         },
         "android": {
           "priority": "high",
          }
      };

      return admin.messaging().sendMulticast(message);
    });

    // Wait for all notifications to be sent
    const responses = await Promise.all(notifications);
  
    res.json({
      success: true,
      statusCode: 200,
      fileName: file.filename 
    });
  } catch(error){
    logger.error(error?.message, {route: req?.originalUrl});
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/device-token", [authenticateToken, validateResource(validator.deviceToken)], async (req, res) => {
  try{
    const token = req.body.token;

    const resDevice = await Devices.findOne({ where: { id: req.user.id } });
      
    if (resDevice === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }

    // update token in table
    const update = await Devices.update( { token: token }, { where: { id: resDevice.id } } );

    return res.json({ success: true, token });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/save-location", [authenticateToken, validateResource(validator.saveLocation)], async (req, res) => {
  try{
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const heading = +req.body.heading || 0;

    await Locations.create( { "device_id": req.user.id, "lat": latitude, "lng": longitude, heading } );

    return res.json({ success: true });
  } catch(err){
    logger.error(err?.message, { route: req?.originalUrl });
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/audio-play-status", [authenticateToken, validateResource(validator.audioPlayStatus)], async (req, res) => {
  try{
    const status = req.body.status;

    await Devices.update(
      { play_audio: status },
      {
        where: {
          id: req.user.id,
        },
      },
    );

    return res.json({ success: true, status });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/notification-status", [authenticateToken, validateResource(validator.notificationStatus)], async (req, res) => {
  try{
    const status = req.body.status;

    await Devices.update(
      { status: status },
      {
        where: {
          id: req.user.id,
        },
      },
    );

    return res.json({ success: true, status });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/fetch-settings", authenticateToken, async (req, res) => {
  try{
    let status = true;
    let play_audio = true;

    const deviceRes = await Devices.findOne({ where: { id: req.user.id } }, { raw: true });
      if(deviceRes)
        status = deviceRes.status;
        play_audio = deviceRes.play_audio;

    return res.json({ success: true, status: status, play_audio });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/fetch-near-devices", authenticateToken, async (req, res) => {
  try{
    const location = JSON.parse(req.body?.location) || {};

    let resArray = [];

    if(location?.latitude && location?.longitude) {
      resData = await getLocationInRadius(location.latitude, location.longitude, req.user.id);

      resArray = resData.map((d) => { return { lat: d.lat, lng: d.lng, name: d.name, heading: d.heading, id: d.id } });
    }

    return res.json({ success: true, data: resArray });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/mobile-verification", [validateResource(validator.mobileVerification)], async (req, res) => {
  try{
    const otp = 1111;

    const mob = /^[1-9]{1}[0-9]{9}$/;

    const mobile = req.body.mobile;
    const countryCode = req.body.countryCode;
    const callingCode = req.body.callingCode;

    // if (mob.test(mobile) == false) {
    //   return res.status(400).json({ success: false, error: errorMessage.mobileInput });
    // }

    let device_id;

    const resDevice = await Devices.findOne({ where: { mobile: mobile } });
      
    if (resDevice === null) {
        const create = await Devices.create( { "mobile": mobile, country_code: countryCode, calling_code: callingCode } );
        device_id = create.id;
    } else {
        if(resDevice.blocked === true) {
          return res.status(400).json({ success: false, error: errorMessage.blockedAccount });
        }

        //check if there are already 3 unused otp request then it will block the action
        const otpRes = await sequelize.query('SELECT id FROM `device_otps` WHERE createdAt >= DATE_SUB( NOW(), INTERVAL 10 MINUTE ) AND status = false AND device_id = '+resDevice.id + ' LIMIT 2', {
          type: QueryTypes.SELECT,
        });

        if(otpRes.length >= 2) {
          return res.status(400).json({ success: false, error: errorMessage.otpSentExceeded });
        }

        device_id = resDevice.id
    }

    //new entry in otp table
    await Otp.create( { "device_id": device_id, "otp":  otp} );

    return res.json({ success: true, mobile });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/otp-verification", [validateResource(validator.otpVerification)], async (req, res) => {
  try{
    const otpCheck = /^[0-9]{4}$/;
    const mob = /^[1-9]{1}[0-9]{9}$/;

    const mobile = req.body.mobile;
    const otp = req.body.otp;

    if (otpCheck.test(otp) == false) {
      return res.status(400).json({ success: false, error: errorMessage.invalidOTP });
    }

    // if (mob.test(mobile) == false) {
    //   return res.status(400).json({ success: false, error: errorMessage.mobileInput });
    // }

    const resDevice = await Devices.findOne({ where: { mobile: mobile } });

    if(resDevice === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }

    if(resDevice.blocked === true) {
      return res.status(400).json({ success: false, error: errorMessage.blockedAccount });
    }
      
    const otpRes = await sequelize.query('SELECT id FROM `device_otps` WHERE createdAt >= DATE_SUB( NOW(), INTERVAL 10 MINUTE ) AND otp = '+otp+' AND status = false AND device_id = '+resDevice.id, {
      type: QueryTypes.SELECT,
    });
    
    // [ { id: 18 } ] => otpRes

    if(otpRes.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid OTP!" });
    }

    // update otp table
    const update = await Otp.update( { status: true }, { where: { device_id: resDevice.id } } );

    // [ 6 ] update

    const token = generateAccessToken(resDevice);

    return res.json({ "success": true, "jwt": token,  "mobile": resDevice.mobile });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/pin-set", [authenticateToken, verifyAccount, validateResource(validator.pinSet)], async (req, res) => {
  try{
    const pinCheck = /^[0-9]{4}$/;

    const pin = req.body.pin;

    if (pinCheck.test(pin) == false) {
      return res.status(400).json({ success: false, error: errorMessage.invalidOTP });
    }

    // update pin in table
    await Devices.update( { mobile_pin: pin, pin_retry_count: 0 }, { where: { id: req.resDevice.id } } );

    return res.json({ "success": true, "pin": pin });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/pin-login", [validateResource(validator.pinLogin)], async (req, res) => {
  try{
    const pinCheck = /^[0-9]{4}$/;
    const mob = /^[1-9]{1}[0-9]{9}$/;

    const mobile = req.body.mobile;
    let pin = req.body.pin;
    pin = +pin || 0;

    if (pinCheck.test(pin) == false) {
      return res.status(400).json({ success: false, error: errorMessage.invalidOTP });
    }

    const resDevice = await Devices.findOne({ where: { mobile: mobile } });

    if(resDevice === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }

    if(resDevice.pin_retry_count >= pinRetryCount) {
      return res.status(400).json({ success: false, error: errorMessage.otpRetryExceeded, pin_retry_count: resDevice.pin_retry_count });
    }

    if(resDevice.mobile_pin !== pin) {
      await Devices.update( { pin_retry_count: (+resDevice.pin_retry_count+1) }, { where: { id: resDevice.id } } );

      return res.status(400).json({ success: false, error: errorMessage.wrongOTP, pin_retry_count: (+resDevice.pin_retry_count+1) });
    }

    if(resDevice.blocked === true) {
      return res.status(400).json({ success: false, error: errorMessage.blockedAccount, pin_retry_count: resDevice.pin_retry_count });
    }

    const token = generateAccessToken(resDevice);

    if(+resDevice.pin_retry_count > 0) {
       await Devices.update( { pin_retry_count: 0 }, { where: { id: resDevice.id } } );
    }

    return res.json({ "success": true, "jwt": token,  "mobile": resDevice.mobile, token: resDevice.token });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/profile-details", authenticateToken, async (req, res) => {
  try{
    const resDevice = await Devices.findOne({ where: { id: req.user.id } });

    if(resDevice === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }

    const profile_img = resDevice.profile_img ? `${SERVER_URL}/${resDevice.profile_img}` : null;

    return res.json({ "success": true, "data": {"name": resDevice.name, "email": resDevice.email, "mobile": resDevice.mobile, "location": resDevice.location, profile_img } });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/profile-details", [authenticateToken, validateResource(validator.profileDetails)], async (req, res) => {
  try{
    const name = req.body.name;
    const email = req.body.email;
    const location = req.body.location;

    const resDevice = await Devices.findOne({ where: { id: req.user.id } });

    if(resDevice === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }
    
    const update = await Devices.update( { name, email, location }, { where: { id: resDevice.id } } );

    const profile_img = resDevice.profile_img ? `${SERVER_URL}/${resDevice.profile_img}` : null;

    return res.json({ "success": true, "data": {name, email, "mobile": resDevice.mobile, location, profile_img } });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/profile-upload", [authenticateToken, verifyAccount, uploadProfileImage.single("photo")], async (req, res, next) => {
  try{
    const file = req.file;

    if (!file) {
      const error = new Error(errorMessage.uploadFile);
      error.statusCode = 400;
      logger.error(errorMessage.uploadFile, {route: req?.originalUrl});
      return next(error);
    }

    await Devices.update( { profile_img: file.path }, { where: { id: req.resDevice.id } } );
    
    const profile_img = `${ SERVER_URL }/${ file.path }`;

    return res.json({ "success": true, "data": {"name": req.resDevice.name, "email": req.resDevice.email, "mobile": req.resDevice.mobile, "location": req.resDevice.location, profile_img } });
  } catch(error){
    logger.error(error?.message, {route: req?.originalUrl});
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/admin-login", [validateResource(validator.adminLogin)], async (req, res) => {
  try{
    const email = req.body.email;
    const password = req.body.password;

    const details = await Admin.findOne({ where: { email, password, status: 1 } });

    if(details === null) {
      return res.status(404).json({ success: false, error: errorMessage.account404 });
    }

    const token = generateAccessTokenForAdmin(details);

    return res.json({ "success": true, "token": token });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/user-list", authenticateTokenForAdmin, async (req, res) => {
  try{
    const limit = +req?.query?.results || 10;
    const page = +req?.query?.page || 1;
    const offset = (page - 1) * limit;

    const list = await Devices.findAll({
      attributes: ['id', 'mobile', 'name', 'email', 'location', 'profile_img', 'blocked'],
      limit,
      offset
    });

    const count = await Devices.count();

    return res.json({ "success": true, list, count });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/reported-user-list", authenticateTokenForAdmin, async (req, res) => {
  try{
    const limit = +req?.query?.results || 10;
    const page = +req?.query?.page || 1;
    const offset = (page - 1) * limit;

    const list = await sequelize.query('SELECT id, mobile, name, email, location, profile_img, blocked,(SELECT count(t1.id) FROM reported_users t1 WHERE t1.admin_action = 0 AND reported_id = devices.id GROUP BY t1.reported_id) total FROM devices WHERE id IN (SELECT reported_id FROM reported_users WHERE admin_action = 0 GROUP BY reported_id) LIMIT '+ offset + ', ' + limit +'', {
      type: QueryTypes.SELECT,
    });

    const count = await sequelize.query('SELECT COUNT(id) total FROM devices WHERE id IN (SELECT reported_id FROM reported_users WHERE admin_action = 0 GROUP BY reported_id)', {
      type: QueryTypes.SELECT,
    });

    return res.json({ "success": true, list, count: count[0]['total'] || 0 });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/block-user-action/:id", authenticateTokenForAdmin, async (req, res) => {
  try{
    const id = +req.params.id || 0;

    if(!id) {
      return res.status(400).json({ success: false, error: "Invalid action!" });
    }

    await ReportedUsers.update( { admin_action: true }, { where: { reported_id: id, admin_action: false } } );

    await Devices.update( { blocked: true }, { where: { id } } );

    return res.json({ "success": true });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/block-unblock-action/:id", authenticateTokenForAdmin, async (req, res) => {
  try{
    const id = +req.params.id || 0;
    const status = req.body.status || false;

    if(!id) {
      return res.status(400).json({ success: false, error: errorMessage.invalidAction });
    }

    await Devices.update( { blocked: status }, { where: { id } } );

    return res.json({ "success": true });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/report-user/:id", [authenticateToken], async (req, res) => {
  try{
    const id = +req.params.id || 0;

    if(!id) {
      return res.status(400).json({ success: false, error: errorMessage.invalidAction });
    }

    const resDevice = await Devices.findOne({ where: { id } });

    if(resDevice === null) {
      return res.status(404).json({ success: false, error: "Reported " + errorMessage.account404 });
    }

    if(resDevice.blocked === false) {
      const create = await ReportedUsers.create({reported_id: id, reported_by: req.user.id});
    }

    return res.json({ "success": true });
  } catch(err){
    logger.error(err?.message, {route: req?.originalUrl});
    return res.status(500).json({ success: false, error: err.message });
  }
});
  
server.listen(port, () => { 
    console.log(`Server is listening at the port: ${port}`); 
});