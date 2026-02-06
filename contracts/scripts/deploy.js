const hre = require("hardhat");

async function main() {
  console.log("Deploying SmartFlowPayInvoices contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");

  const SmartFlowPayInvoices = await hre.ethers.getContractFactory("SmartFlowPayInvoices");
  const contract = await SmartFlowPayInvoices.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("SmartFlowPayInvoices deployed to:", contractAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("\nAdd this address to your Next.js .env file:");
  console.log(`NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS=${contractAddress}`);

  if (hre.network.name === "bsctest") {
    console.log("\nVerify on BSCScan Testnet:");
    console.log(`https://testnet.bscscan.com/address/${contractAddress}`);
  } else if (hre.network.name === "bsc") {
    console.log("\nVerify on BSCScan:");
    console.log(`https://bscscan.com/address/${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
