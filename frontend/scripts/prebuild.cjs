const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const abiPath = process.env.CONTRACT_ABI_PATH;
console.log(abiPath);
const targetPath = path.resolve(__dirname, '../src/abi.json');

fs.copyFileSync(abiPath, targetPath);
console.log(`ABI file copied from ${abiPath} to ${targetPath}`);
