const { Sequelize, DataTypes } = require('sequelize');
const {sequelize} = require('./config');

const Devices = sequelize.define(
  'devices',
  {
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }
);

(async () => {
    await sequelize.sync();
    // Code here
})();

module.exports = { Devices };