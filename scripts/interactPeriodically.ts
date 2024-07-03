// scripts/interactPeriodically.ts
import { time } from "@nomicfoundation/hardhat-network-helpers";


async function main() {
  
    // Function to mine a block regardless of transaction and increase timestamp by 12 seconds
    const performTransaction = async () => {
        await time.increase(12);
    };

  // Perform the "transaction" immediately and then every 12 seconds
  await performTransaction();
  setInterval(performTransaction, 12000);
}

main()
  .then(() => console.log("Script running..."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
