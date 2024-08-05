const { Sequelize } = require('sequelize');

// mysql
// const sequelize = new Sequelize('audio_record_v1', 'subuser', '123456', {
//     host: 'localhost',
//     dialect: 'mysql',
//     logging: false
// });

// postgres
const sequelize = new Sequelize('audio_record_v1', 'postgres', '123456', {
    host: 'localhost',
    dialect: 'postgres',
    port: 5432,
    logging: false,
    define: {
        underscored: true
    }
});

module.exports = { sequelize };