import { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { Provider } from '@ethersproject/providers';
import { Contract, ContractFactory, Wallet } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @ts-ignore
import { generateUtil } from 'eth-delegatable-utils';
import { getPrivateKeys } from '../utils/getPrivateKeys';
import { generateDelegation } from './utils';

const { getSigners } = ethers;

async function getPermitSignature(
  signer: any,
  token: any,
  spender: any,
  value: any,
  deadline: any,
) {
  const [nonce, name, version, chainId] = await Promise.all([
    token.nonces(signer.address),
    token.name(),
    '1',
    signer.getChainId(),
  ]);

  return ethers.utils.splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: 'owner',
            type: 'address',
          },
          {
            name: 'spender',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'nonce',
            type: 'uint256',
          },
          {
            name: 'deadline',
            type: 'uint256',
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}

describe('ERC20Manager', () => {
  const CONTRACT_NAME = 'ERC20Manager';
  let CONTRACT_INFO: any;
  let delegatableUtils: any;

  let signer0: SignerWithAddress;
  let signer1: SignerWithAddress;
  let erc20ManagerContract: Contract;
  let erc20ManagerFactory: ContractFactory;
  let erc20PermitTokenFactory: ContractFactory;
  let erc20PermitToken: Contract;
  let wallet0: Wallet;
  let wallet1: Wallet;
  let pk0: string;
  let pk1: string;
  let erc20FromAllowanceEnforcer: Contract;
  let erc20FromAllowanceEnforcerFactory: ContractFactory;

  before(async () => {
    [signer0, signer1] = await getSigners();
    [wallet0, wallet1] = getPrivateKeys(signer0.provider as unknown as Provider); //
    erc20ManagerFactory = await ethers.getContractFactory('ERC20Manager');
    erc20PermitTokenFactory = await ethers.getContractFactory('TokenPermit');
    erc20FromAllowanceEnforcerFactory = await ethers.getContractFactory(
      'ERC20FromAllowanceEnforcer',
    );
    pk0 = wallet0._signingKey().privateKey;
    pk1 = wallet1._signingKey().privateKey;
  });

  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [],
    });
    erc20PermitToken = await erc20PermitTokenFactory.connect(wallet0).deploy();
    await erc20PermitToken.deployed();

    erc20ManagerContract = await erc20ManagerFactory.connect(wallet0).deploy();
    await erc20ManagerContract.deployed();

    erc20FromAllowanceEnforcer = await erc20FromAllowanceEnforcerFactory.connect(wallet0).deploy();

    CONTRACT_INFO = {
      chainId: erc20ManagerContract.deployTransaction.chainId,
      verifyingContract: erc20ManagerContract.address,
      name: CONTRACT_NAME,
    };
    delegatableUtils = generateUtil(CONTRACT_INFO);
  });

  it('should SUCCEED to approveSubscriptiopn', async () => {
    expect(
      await erc20PermitToken.allowance(wallet0.address, erc20ManagerContract.address),
    ).to.equal(0);
    const deadline = ethers.constants.MaxUint256;
    let totalApprovedAmount = 12;
    const { v, r, s } = await getPermitSignature(
      wallet0,
      erc20PermitToken,
      erc20ManagerContract.address,
      totalApprovedAmount,
      deadline,
    );

    const INVOCATION_MESSAGE = {
      replayProtection: {
        nonce: '0x01',
        queue: '0x00',
      },
      batch: [
        {
          authority: [],
          transaction: {
            to: erc20ManagerContract.address,
            gasLimit: '210000000000000000',
            data: (
              await erc20ManagerContract.populateTransaction.approveTransferProxy(
                erc20PermitToken.address,
                wallet0.address,
                totalApprovedAmount,
                deadline,
                v,
                r,
                s,
              )
            ).data,
          },
        },
      ],
    };

    const invocation = delegatableUtils.signInvocation(INVOCATION_MESSAGE, pk1);

    let tx = await erc20ManagerContract.invoke([
      {
        signature: invocation.signature,
        invocations: invocation.invocations,
      },
    ]);
    expect(
      await erc20PermitToken.allowance(wallet0.address, erc20ManagerContract.address),
    ).to.equal(totalApprovedAmount);
  });

  it('should SUCCEED to INVOKE transferProxy', async () => {
    expect(
      await erc20PermitToken.allowance(wallet0.address, erc20ManagerContract.address),
    ).to.equal(0);
    const deadline = ethers.constants.MaxUint256;
    const totalApprovedAmount = ethers.utils.parseEther('0.5');
    const { v, r, s } = await getPermitSignature(
      wallet0,
      erc20PermitToken,
      erc20ManagerContract.address,
      totalApprovedAmount,
      deadline,
    );

    const inputTerms = ethers.utils.hexZeroPad(ethers.utils.parseEther('0.5').toHexString(), 32);

    const _delegation = generateDelegation(
      CONTRACT_NAME,
      erc20ManagerContract,
      pk0,
      wallet1.address,
      [
        {
          enforcer: erc20FromAllowanceEnforcer.address,
          terms: inputTerms,
        },
      ],
    );

    const INVOCATION_MESSAGE = {
      replayProtection: {
        nonce: '0x01',
        queue: '0x00',
      },
      batch: [
        {
          authority: [],
          transaction: {
            to: erc20ManagerContract.address,
            gasLimit: '210000000000000000',
            data: (
              await erc20ManagerContract.populateTransaction.approveTransferProxy(
                erc20PermitToken.address,
                wallet0.address,
                totalApprovedAmount,
                deadline,
                v,
                r,
                s,
              )
            ).data,
          },
        },
        {
          authority: [_delegation],
          transaction: {
            to: erc20ManagerContract.address,
            gasLimit: '210000000000000000',
            data: (
              await erc20ManagerContract.populateTransaction.transferProxy(
                erc20PermitToken.address,
                wallet1.address,
                totalApprovedAmount,
              )
            ).data,
          },
        },
      ],
    };

    const invocation = delegatableUtils.signInvocation(INVOCATION_MESSAGE, pk1);

    let tx = await erc20ManagerContract.invoke([
      {
        signature: invocation.signature,
        invocations: invocation.invocations,
      },
    ]);
    expect(await erc20PermitToken.balanceOf(wallet1.address)).to.equal(totalApprovedAmount);
  });

  it('should FAIL to INVOKE transferProxy with greater than approved amount', async () => {
    expect(
      await erc20PermitToken.allowance(wallet0.address, erc20ManagerContract.address),
    ).to.equal(0);
    const deadline = ethers.constants.MaxUint256;
    const totalApprovedAmount = ethers.utils.parseEther('0.5');
    const { v, r, s } = await getPermitSignature(
      wallet0,
      erc20PermitToken,
      erc20ManagerContract.address,
      totalApprovedAmount,
      deadline,
    );

    const inputTerms = ethers.utils.hexZeroPad(ethers.utils.parseEther('0.5').toHexString(), 32);

    const _delegation = generateDelegation(
      CONTRACT_NAME,
      erc20ManagerContract,
      pk0,
      wallet1.address,
      [
        {
          enforcer: erc20FromAllowanceEnforcer.address,
          terms: inputTerms,
        },
      ],
    );

    const INVOCATION_MESSAGE = {
      replayProtection: {
        nonce: '0x01',
        queue: '0x00',
      },
      batch: [
        {
          authority: [],
          transaction: {
            to: erc20ManagerContract.address,
            gasLimit: '210000000000000000',
            data: (
              await erc20ManagerContract.populateTransaction.approveTransferProxy(
                erc20PermitToken.address,
                wallet0.address,
                totalApprovedAmount,
                deadline,
                v,
                r,
                s,
              )
            ).data,
          },
        },
        {
          authority: [_delegation],
          transaction: {
            to: erc20ManagerContract.address,
            gasLimit: '210000000000000000',
            data: (
              await erc20ManagerContract.populateTransaction.transferProxy(
                erc20PermitToken.address,
                wallet1.address,
                ethers.utils.parseEther('0.6'),
              )
            ).data,
          },
        },
      ],
    };

    const invocation = delegatableUtils.signInvocation(INVOCATION_MESSAGE, pk1);

    await expect(
      erc20ManagerContract.invoke([
        {
          signature: invocation.signature,
          invocations: invocation.invocations,
        },
      ]),
    ).to.be.revertedWith('ERC20FromAllowanceEnforcer:allowance-exceeded');
  });
});
