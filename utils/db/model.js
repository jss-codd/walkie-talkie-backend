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
    mobile_pin: {
      type: DataTypes.INTEGER,
      allowNull: true,
  },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profile_img: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    play_audio: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    otp_retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lat: {
      type: DataTypes.STRING
    },
    lng: {
      type: DataTypes.STRING
    },
    heading: {
      type: DataTypes.STRING,
      defaultValue: null
    },
  }
);

const Otp = sequelize.define(
  'device_otps',
  {
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }
);

const Admin = sequelize.define(
  'admin',
  {
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }
);

const ReportedUsers = sequelize.define(
  'reported_users',
  {
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    reported_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reported_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    admin_action: {
      type: DataTypes.INTEGER,
      defaultValue: false
    }
  }
);

(async () => {
    await sequelize.sync();
    // Code here
})();

module.exports = { Devices, Locations, Otp, Admin, ReportedUsers };