const { QueryTypes } = require('sequelize');

const { sequelize } = require('./db/config');

const getLocationInRadius = async (lat, lng, user_id, radius = 20000) => {
    const res = await sequelize.query('SELECT t1.id, t2.token, t2.name, t1.device_id, t1.lat, t1.lng, t1.heading, (6371 * acos( cos( radians('+lat+') ) * cos( radians(t1.lat) ) * cos( radians(t1.lng) - radians('+lng+')) + sin(radians('+lat+')) * sin(radians(t1.lat)) )) as distance FROM (SELECT * FROM locations WHERE id IN (SELECT MAX(id) FROM locations WHERE device_id != ' + user_id + ' GROUP BY device_id)) t1 INNER JOIN devices t2 ON t2.id =  t1.device_id WHERE t2.token != "" HAVING distance < ' + radius + ' LIMIT 1000', {
    type: QueryTypes.SELECT,
    });

    return res;
}

module.exports = { getLocationInRadius };