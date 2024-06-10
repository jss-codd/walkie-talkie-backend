const { Devices } = require("./db/model");

const getDeviceTokens = async () => {
    const tokenRes = await Devices.findAll( { where: { status: true } }, { raw: true } );

    return tokenRes;
}

module.exports = { getDeviceTokens };