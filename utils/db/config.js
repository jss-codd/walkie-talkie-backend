const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('audio_record', 'subuser', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    // logging: false
});

module.exports = { sequelize };