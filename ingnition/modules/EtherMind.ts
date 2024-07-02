import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_GWEI: bigint = 1_000_000_000n;

const EMModule = buildModule("EMModule", (m) => {
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);


  //NO CONSTRUCTOR? WHAT NOW?
  const EM = m.contract("EtherMind");

  return { EM };
});

export default EMModule;