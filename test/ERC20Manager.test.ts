import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import { ethers } from 'hardhat';

const { getSigners, utils } = ethers;
const { parseEther: toWei } = utils;

describe('ERC20Manager', () => {
  let wallet0: SignerWithAddress;
  let wallet1: SignerWithAddress;
  let wallet2: SignerWithAddress;
  let ERC20Manager: Contract;
  let ERC20ManagerFactory: ContractFactory;

  before(async () => {
    [wallet0, wallet1, wallet2] = await getSigners();
    ERC20ManagerFactory = await ethers.getContractFactory('ERC20Manager');
  });

  beforeEach(async () => {
    ERC20Manager = await ERC20ManagerFactory.deploy();
  });

  describe('constructor', () => {
    it('should deploy', async () => {
      expect(ERC20Manager.address).to.be.properAddress;
    });
  });
});
