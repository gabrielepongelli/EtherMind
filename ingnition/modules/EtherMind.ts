import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EMModule = buildModule("EMModule", (m) => {
    const EM = m.contract("EtherMind");
    return { EM };
});

export default EMModule;