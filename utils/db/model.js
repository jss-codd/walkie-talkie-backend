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

const Locations = sequelize.define(
  'locations',
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
    lat: {
      type: DataTypes.STRING
    },
    lng: {
      type: DataTypes.STRING
    }
  }
);

(async () => {
    await sequelize.sync();
    // Code here
})();

module.exports = { Devices, Locations };