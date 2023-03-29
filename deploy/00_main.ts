import { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function deploy(hardhat: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hardhat;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("ERC20Manager", {
    contract: "ERC20Manager",
    from: deployer,
    args: [],
    skipIfAlreadyDeployed: false,
    log: true,
  });
}
