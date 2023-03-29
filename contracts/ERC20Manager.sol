//SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { Delegatable } from "@delegatable/delegatable-sol/contracts/Delegatable.sol";
import { DelegatableCore } from "@delegatable/delegatable-sol/contracts/DelegatableCore.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ERC20Manager
 * @author McOso
 * @notice Manages the erc20 delegation
 */
contract ERC20Manager is Delegatable {

  /* ===================================================================================== */
  /* Constructor & Modifiers                                                               */
  /* ===================================================================================== */

  constructor() Delegatable("ERC20Manager", "1") {}


  /* ===================================================================================== */
  /* External Functions                                                                    */
  /* ===================================================================================== */

  // ========================
  // READS
  // ========================

  // ========================
  // WRITES
  // ========================
  function transferProxy(address _token, address _from, uint256 _amount) external returns (bool) {
    require(_msgSender() == _from, "ERC20Manager:transferProxy-not-authorized");
    return IERC20(_token).transfer(_from, _amount);
  }

  /* ===================================================================================== */
  /* Internal Functions                                                                    */
  /* ===================================================================================== */
  function _msgSender()
    internal
    view
    virtual
    override(DelegatableCore)
    returns (address sender)
  {
    if (msg.sender == address(this)) {
      bytes memory array = msg.data;
      uint256 index = msg.data.length;
      assembly {
        sender := and(mload(add(array, index)), 0xffffffffffffffffffffffffffffffffffffffff)
      }
    } else {
      sender = msg.sender;
    }
    return sender;
  }
}
