const multer = require("multer");
const fs = require("fs");

const { authJwt, validateResource } = require("../utils/middleware");
const validator = require("../utils/Validator");

module.exports = app => {
    const admin  = require("../controllers/admin.controller.js");
    
    var router   = require("express").Router();

    router.post("/admin-login", [validateResource(validator.adminLogin)], admin.adminLogin);

    router.get("/user-list", [authJwt.authenticateTokenForAdmin], admin.userList);

    router.get("/reported-user-list", [authJwt.authenticateTokenForAdmin], admin.reportedUserList);

    router.put("/block-user-action/:id", [authJwt.authenticateTokenForAdmin], admin.blockUserAction);

    router.put("/block-unblock-action/:id", [authJwt.authenticateTokenForAdmin], admin.blockUnblockAction);

    router.post("/create-channel", [authJwt.authenticateTokenForAdmin, validateResource(validator.createChannel)], admin.createChannel);

    router.get("/channel-list", [authJwt.authenticateTokenForAdmin], admin.channelList);

    router.put("/channel-status-action/:id", [authJwt.authenticateTokenForAdmin], admin.channelStatusAction);

    app.use('/api/admin', router);
  };