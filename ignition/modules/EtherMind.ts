import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EtherMind = buildModule("EtherMind", (m) => {
    const EM = m.contract("EtherMind");
    return { EM };
});

export default EtherMind;