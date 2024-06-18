const { QueryTypes } = require('sequelize');

const {sequelize} = require('./db/config');
const { Locations } = require("./db/model");

const getLocationInRadius = async (lat, lng, radius = 30) => {
    const res = await sequelize.query('SELECT t1.id, t1.token, (6371 * acos( cos( radians('+lat+') ) * cos( radians(t1.lat) ) * cos( radians(t1.lng) - radians('+lng+')) + sin(radians('+lat+')) * sin(radians(t1.lat)) )) as distance FROM (SELECT * FROM locations WHERE id IN (SELECT MAX(id) FROM locations GROUP BY token)) t1 HAVING distance < ' + radius + ' LIMIT 1000', {
    type: QueryTypes.SELECT,
    });

    return res;
}

module.exports = { getLocationInRadius };