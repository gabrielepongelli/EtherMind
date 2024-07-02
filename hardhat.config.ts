require('dotenv').config();

const configFile = `./hardhat.config.${process.env.HARDHAT_CONFIG || 'dev'}.ts`;

module.exports = require(configFile);