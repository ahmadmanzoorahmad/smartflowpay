require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Clean and format the private key
let PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
PRIVATE_KEY = PRIVATE_KEY.trim();
if (!PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = "0x" + PRIVATE_KEY;
}
// Ensure it's exactly 66 characters (0x + 64 hex chars)
if (PRIVATE_KEY.length > 66) {
  PRIVATE_KEY = PRIVATE_KEY.substring(0, 66);
}
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545";
const BSC_MAINNET_RPC = process.env.BSC_MAINNET_RPC || "https://bsc-dataseed1.binance.org";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    bsctest: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [PRIVATE_KEY],
    },
    bsc: {
      url: BSC_MAINNET_RPC,
      chainId: 56,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
