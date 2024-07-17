const admin = require("firebase-admin");
const { QueryTypes } = require('sequelize');

const { getLocationInRadius } = require('../utils/Location');
const { Devices, Locations, Otp, ReportedUsers, Channels } = require("../utils/db/model");
const { SERVER_URL, errorMessage, pinRetryCount } = require("../utils/Constants");
const { generateAccessToken } = require('../utils/Token');
const logger = require("../logger");
var serviceAccount = require("../serviceAccountKey.json");
const { sequelize } = require('../utils/db/config');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

exports.pinLogin = async (req, res) => {
    try{
        // Validate request
        if (!req.body) {
        return res.status(400).send({
            message: "Content can not be empty!",
          });
        }
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

        const profile_img = resDevice.profile_img ? `${ SERVER_URL }/${ resDevice.profile_img }` : null;
    
        return res.json({ "success": true, "jwt": token,  "mobile": resDevice.mobile, token: resDevice.token, "data": {"name": resDevice.name, "email": resDevice.email, "mobile": resDevice.mobile, "location": resDevice.location, profile_img, id: resDevice.id, status: resDevice.status } });
    } catch(err){
        logger.error(err?.message, {route: req?.originalUrl});
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.upload = async (req, res, next) => {
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
};

exports.deviceToken = async (req, res) => {
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
};

exports.saveLocation = async (req, res) => {
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
};

exports.audioPlayStatus = async (req, res) => {
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
};

exports.notificationStatus = async (req, res) => {
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
};

exports.fetchSettings = async (req, res) => {
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
};

exports.fetchNearDevices = async (req, res) => {
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
};

exports.mobileVerification = async (req, res) => {
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
};

exports.otpVerification = async (req, res) => {
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
};

exports.pinSet = async (req, res) => {
    try{
        const pinCheck = /^[0-9]{4}$/;
    
        const pin = req.body.pin;
    
        if (pinCheck.test(pin) == false) {
          return res.status(400).json({ success: false, error: errorMessage.invalidOTP });
        }
    
        // update pin in table
        await Devices.update( { mobile_pin: pin, pin_retry_count: 0 }, { where: { id: req.resDevice.id } } );
    
        // return res.json({ "success": true, "pin": pin });
        const profile_img = req.resDevice.profile_img ? `${ SERVER_URL }/${ req.resDevice.profile_img }` : null;

        return res.json({ "success": true, "pin": pin, "data": {"name": req.resDevice.name, "email": req.resDevice.email, "mobile": req.resDevice.mobile, "location": req.resDevice.location, profile_img, id: req.resDevice.id, status: req.resDevice.status } });
      } catch(err){
        logger.error(err?.message, {route: req?.originalUrl});
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.profileDetails = async (req, res) => {
    try{
        const resDevice = await Devices.findOne({ where: { id: req.user.id } });
    
        if(resDevice === null) {
          return res.status(404).json({ success: false, error: errorMessage.account404 });
        }
    
        const profile_img = resDevice.profile_img ? `${ SERVER_URL }/${ resDevice.profile_img }` : null;
    
        return res.json({ "success": true, "data": {"name": resDevice.name, "email": resDevice.email, "mobile": resDevice.mobile, "location": resDevice.location, profile_img, id: resDevice.id, status: resDevice.status } });
      } catch(err){
        logger.error(err?.message, {route: req?.originalUrl});
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.profileDetailsPost = async (req, res) => {
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
    
        return res.json({ "success": true, "data": {name, email, "mobile": resDevice.mobile, location, profile_img, id: resDevice.id, status: resDevice.status } });
      } catch(err){
        logger.error(err?.message, {route: req?.originalUrl});
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.profileUpload = async (req, res, next) => {
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
};

exports.reportUser = async (req, res, next) => {
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
};

exports.channelList = async (req, res) => {
  try{
      const list = await Channels.findAll({where: {status: true}});
  
      return res.json({ "success": true, list });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.emailSubmit = async (req, res) => {
  try{
      const email = req.body.email;
  
      const resDevice = await Devices.findOne({ where: { id: req.user.id } });
  
      if(resDevice === null) {
        return res.status(404).json({ success: false, error: errorMessage.account404 });
      }
      
      const update = await Devices.update( { email }, { where: { id: resDevice.id } } );
  
      const profile_img = resDevice.profile_img ? `${SERVER_URL}/${resDevice.profile_img}` : null;
  
      return res.json({ "success": true, "data": {name: resDevice.name, email, mobile: resDevice.mobile, location: resDevice.location, profile_img } });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.locationSubmit = async (req, res) => {
  try{
      const location = req.body.location;
  
      const resDevice = await Devices.findOne({ where: { id: req.user.id } });
  
      if(resDevice === null) {
        return res.status(404).json({ success: false, error: errorMessage.account404 });
      }
      
      const update = await Devices.update( { location }, { where: { id: resDevice.id } } );
  
      const profile_img = resDevice.profile_img ? `${SERVER_URL}/${resDevice.profile_img}` : null;
  
      return res.json({ "success": true, "data": {name: resDevice.name, email: resDevice.email, mobile: resDevice.mobile, location, profile_img } });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.nameSubmit = async (req, res) => {
  try{
      const name = req.body.name;
  
      const resDevice = await Devices.findOne({ where: { id: req.user.id } });
  
      if(resDevice === null) {
        return res.status(404).json({ success: false, error: errorMessage.account404 });
      }
      
      const update = await Devices.update( { name }, { where: { id: resDevice.id } } );
  
      const profile_img = resDevice.profile_img ? `${SERVER_URL}/${resDevice.profile_img}` : null;
  
      return res.json({ "success": true, "data": {name, email: resDevice.email, mobile: resDevice.mobile, location: resDevice.location, profile_img } });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};