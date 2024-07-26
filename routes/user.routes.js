const multer = require("multer");
const fs = require("fs");

const { authJwt, validateResource } = require("../utils/middleware");
const validator = require("../utils/Validator");

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
    

const uploadFiles = multer({ storage: storage });

const uploadProfileImage = multer({ storage: storageProfileImage });

module.exports = app => {
    const users  = require("../controllers/user.controller.js");
    
    var router   = require("express").Router();

    router.post("/pin-login", [validateResource(validator.pinLogin)], users.pinLogin);

    router.post("/upload", [authJwt.authenticateToken, authJwt.verifyAccount, uploadFiles.single("file")], users.upload);

    router.post("/device-token", [authJwt.authenticateToken, validateResource(validator.deviceToken)], users.deviceToken);

    router.post("/save-location", [authJwt.authenticateToken, validateResource(validator.saveLocation)], users.saveLocation);

    router.put("/audio-play-status", [authJwt.authenticateToken, validateResource(validator.audioPlayStatus)], users.audioPlayStatus);

    router.put("/notification-status", [authJwt.authenticateToken, validateResource(validator.notificationStatus)], users.notificationStatus);

    router.post("/fetch-settings", [authJwt.authenticateToken], users.fetchSettings);

    router.post("/fetch-near-devices", [authJwt.authenticateToken], users.fetchNearDevices);

    router.post("/mobile-verification", [validateResource(validator.mobileVerification)], users.mobileVerification);

    router.post("/otp-verification", [validateResource(validator.otpVerification)], users.otpVerification);

    router.post("/pin-set", [authJwt.authenticateToken, authJwt.verifyAccount, validateResource(validator.pinSet)], users.pinSet);

    router.get("/profile-details", [authJwt.authenticateToken], users.profileDetails);

    router.post("/profile-details", [authJwt.authenticateToken, validateResource(validator.profileDetails)], users.profileDetailsPost);

    router.post("/profile-upload", [authJwt.authenticateToken, authJwt.verifyAccount, authJwt.verifyAccount, uploadProfileImage.single("photo")], users.profileUpload);

    router.post("/report-user/:id", [authJwt.authenticateToken], users.reportUser);

    router.get("/channel-list", users.channelList);

    router.post("/email-submit", [authJwt.authenticateToken, validateResource(validator.emailSubmit)], users.emailSubmit);

    router.post("/location-submit", [authJwt.authenticateToken, validateResource(validator.locationSubmit)], users.locationSubmit);

    router.post("/name-submit", [authJwt.authenticateToken, validateResource(validator.nameSubmit)], users.nameSubmit);

    router.post("/icon-tap-action", [authJwt.authenticateToken, validateResource(validator.iconTapAction)], users.iconTapAction);

    router.get("/camera-list/:id", [authJwt.authenticateToken], users.cameraList);

    router.get("/action-icon-list/:id", [authJwt.authenticateToken], users.actionIconList);

    app.use('/api/users', router);
  };