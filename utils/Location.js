const { QueryTypes } = require('sequelize');

const { sequelize } = require('./db/config');

// not using
const getLocationInRadius = async (lat, lng, user_id, radius = 20000) => {
    const res = await sequelize.query('SELECT t1.id, t2.token, t2.name, t1.device_id, t1.lat, t1.lng, t1.heading, (6371 * acos( cos( radians('+lat+') ) * cos( radians(t1.lat) ) * cos( radians(t1.lng) - radians('+lng+')) + sin(radians('+lat+')) * sin(radians(t1.lat)) )) as distance FROM (SELECT * FROM locations WHERE id IN (SELECT MAX(id) FROM locations WHERE device_id != ' + user_id + ' GROUP BY device_id)) t1 INNER JOIN devices t2 ON t2.id =  t1.device_id WHERE t2.token != "" HAVING distance < ' + radius + ' LIMIT 1000', {
    type: QueryTypes.SELECT,
    });

    return res;
}

const getCameraInRadius = async (lat, lng, channel_id, radius = 0.05) => {
    const res = await sequelize.query('SELECT id, (6371 * acos( cos( radians('+lat+') ) * cos( radians(lat) ) * cos( radians(lng) - radians('+lng+')) + sin(radians('+lat+')) * sin(radians(lat)) )) as distance FROM action_icon_locations WHERE type = "camera" AND channel_id = ' + channel_id + ' HAVING distance <= ' + radius, {
    type: QueryTypes.SELECT,
    });

    return res;
}

const getActionIconsInRadius = async (lat, lng, channel_id, type, radius = 0.05) => {
    const res = await sequelize.query('SELECT id, (6371 * acos( cos( radians('+lat+') ) * cos( radians(lat) ) * cos( radians(lng) - radians('+lng+')) + sin(radians('+lat+')) * sin(radians(lat)) )) as distance FROM action_icon_locations WHERE type = "'+ type +'" AND channel_id = ' + channel_id + ' AND createdAt >= DATE_SUB( NOW(), INTERVAL 360 MINUTE ) HAVING distance <= ' + radius, {
    type: QueryTypes.SELECT,
    });

    return res;
}

const getActionIconLists = async (channel_id) => {
    const res = await sequelize.query('SELECT lat, lng, type, createdAt FROM action_icon_locations WHERE type != "camera" AND channel_id = ' + channel_id + ' AND createdAt >= DATE_SUB( NOW(), INTERVAL 360 MINUTE )', {
    type: QueryTypes.SELECT,
    });

    return res;
}

module.exports = { getLocationInRadius, getCameraInRadius, getActionIconsInRadius, getActionIconLists };