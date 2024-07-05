require('dotenv').config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    gasReporter: {
        currency: 'EUR',
        coinmarketcap: process.env.COINMARKETCAP_API_KEY
    },
    networks: {
        hardhat: {
            // dosen't mine automatically but once every 11-13s
            mining: {
                auto: false,
                interval: [11000, 13000]
            }
        }
    },
};

export default config;