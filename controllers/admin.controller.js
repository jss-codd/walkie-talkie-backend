const { QueryTypes } = require('sequelize');

const { Devices, Admin, ReportedUsers, Channels, Settings } = require("../utils/db/model");
const { errorMessage } = require("../utils/Constants");
const { generateAccessTokenForAdmin } = require('../utils/Token');
const logger = require("../logger");
const { sequelize } = require('../utils/db/config');
const validator = require("../utils/Validator");

exports.adminLogin = async (req, res) => {
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
};

exports.userList = async (req, res) => {
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
};

exports.reportedUserList = async (req, res) => {
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
};

exports.blockUserAction = async (req, res) => {
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
};

exports.blockUnblockAction = async (req, res) => {
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
};

exports.createChannel = async (req, res) => {
  try{
      const startingValue = req.body.startingValue;
      const destinationValue = req.body.destinationValue;
  
      await Channels.create({ starting_loc_address: startingValue.formatted_address, starting_loc_place_id: startingValue.place_id, destination_loc_address: destinationValue.formatted_address, destination_loc_place_id: destinationValue.place_id });
  
      return res.json({ "success": true });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.channelList = async (req, res) => {
  try{
      const list = await Channels.findAll();
  
      return res.json({ "success": true, list });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.channelStatusAction = async (req, res) => {
  try{
      const id = +req.params.id || 0;
      const status = req.body.status || false;
  
      if(!id) {
        return res.status(400).json({ success: false, error: errorMessage.invalidAction });
      }
  
      await Channels.update( { status }, { where: { id } } );
  
      return res.json({ "success": true });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.settingsList = async (req, res) => {
  try{
      const list = await Settings.findAll( { attributes: ["metakey", "metavalue"] } );
  
      return res.json({ "success": true, list });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.submitSetting = async (req, res) => {
  try{
      const key = req.body.key;

      if(key === 'callTimer') {
        const validData = await validator.callTimerSubmit.validate(req.body);

        // check in db first
        const data = await Settings.findOne( { attributes: ["id"], where: { metakey: key } } );

        if(data === null) {
          await Settings.create({ metakey: key, metavalue: validData.val });
        } else {
          await Settings.update({ metavalue: validData.val }, { where: { id: data.id } });
        }

        return res.json({ "success": true });
      } else {
        throw new Error("Type is invalid!");
      }
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.userCountByStatus = async (req, res) => {
  try{
      const result = await sequelize.query('SELECT SUM(CASE WHEN blocked = false THEN 1 ELSE 0 END) AS countActive, SUM(CASE WHEN blocked = true THEN 1 ELSE 0 END) AS countBlocked, COUNT(*) AS totalCount FROM devices', {
        type: QueryTypes.SELECT,
        });
  
      return res.json({ "success": true, result });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};

exports.userSignupCountByMonth = async (req, res) => {
  try{
      const result = await sequelize.query('SELECT DATE_FORMAT(createdAt, "%Y-%m") AS month, COUNT(*) AS userCount FROM devices WHERE createdAt >= DATE_FORMAT(CURDATE() - INTERVAL 6 MONTH, "%Y-%m-01") GROUP BY month ORDER BY month DESC', {
        type: QueryTypes.SELECT,
        });
  
      return res.json({ "success": true, result });
    } catch(err){
      logger.error(err?.message, {route: req?.originalUrl});
      return res.status(500).json({ success: false, error: err.message });
  }
};