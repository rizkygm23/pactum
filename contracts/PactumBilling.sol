// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title PactumBilling (State Channel / Unified Gateway)
 * @dev Manages universal user deposits that can be settled to multiple AI merchants.
 */
contract PactumBilling {
    IERC20 public usdc;
    address public platformOperator;

    // balances[user_address] = user_deposit_balance
    mapping(address => uint256) public userBalances;
    
    // merchantBalances[merchant_address] = collected_fees
    mapping(address => uint256) public merchantBalances;

    event Deposited(address indexed user, uint256 amount);
    event UsageSettled(address indexed user, address indexed merchant, uint256 amount);
    event UserWithdrawn(address indexed user, uint256 amount);
    event MerchantWithdrawn(address indexed merchant, uint256 amount);

    modifier onlyOperator() {
        require(msg.sender == platformOperator, "Only operator can call this");
        _;
    }

    constructor(address _usdcToken) {
        usdc = IERC20(_usdcToken);
        platformOperator = msg.sender;
    }

    /**
     * @dev User deposits USDC into the contract to be used for AI usage across platforms.
     * User must have called `approve` on the USDC contract first.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Deposit must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        userBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Backend (Platform Operator) settles off-chain usage in batches.
     * Moves funds from user balances to various merchant balances.
     */
    function batchSettleUsage(
        address[] calldata users,
        address[] calldata merchants,
        uint256[] calldata amounts
    ) external onlyOperator {
        require(
            users.length == merchants.length && merchants.length == amounts.length,
            "Array length mismatch"
        );
        
        for (uint i = 0; i < users.length; i++) {
            address u = users[i];
            address m = merchants[i];
            uint256 a = amounts[i];
            
            require(userBalances[u] >= a, "Insufficient user balance");
            
            userBalances[u] -= a;
            merchantBalances[m] += a;
            
            emit UsageSettled(u, m, a);
        }
    }

    /**
     * @dev User withdraws their remaining unused USDC.
     */
    function withdrawUser(uint256 amount) external {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        userBalances[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit UserWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Any AI Provider/Merchant withdraws their earned collected fees.
     */
    function withdrawMerchant(uint256 amount) external {
        require(merchantBalances[msg.sender] >= amount, "Insufficient merchant fees");
        
        merchantBalances[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit MerchantWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Allow operator to transfer ownership/operator role
     */
    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "Invalid address");
        platformOperator = newOperator;
    }
}
