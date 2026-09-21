// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* ────────────────────────────────────────────────────────────────────────────
 * PactumBilling v2 — prepaid USDC metering settlement for AI services on Arc.
 *
 * Arc notes (per docs.arc.io /arc/references/evm-differences):
 *  - USDC is the native gas token. This contract ONLY uses the 6-decimal
 *    ERC-20 interface at 0x3600…0000 and never touches msg.value or the
 *    18-decimal native view.
 *  - Native USDC and ERC-20 USDC share one balance: this contract must never
 *    "sweep" its raw native balance — that would take user funds. Stray value
 *    can only leave via sweepSurplus(), bounded by balanceOf − totalOwed.
 *  - ERC-20 transfers can revert at runtime for blocklisted addresses; every
 *    token transfer return value is checked.
 *
 * Custody model (explicit): the operator is a trusted role. batchSettleUsage
 * moves any user balance to any merchant. Mitigations in v2: pausable
 * settlements, two-step operator hand-off, capped on-chain platform fee,
 * and a user escape hatch (withdrawUser) that always stays open — including
 * while paused.
 * ──────────────────────────────────────────────────────────────────────────── */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title PactumBilling
/// @notice Prepaid state-channel billing: users deposit USDC, the operator
///  settles metered usage in batches to merchants, everyone withdraws what is
///  theirs. Deployed on Arc, where USDC is both the settlement asset and gas.
/// @dev Self-contained by design (compiled with standalone solc, no imports).
contract PactumBilling {
    // ── Constants ───────────────────────────────────────────────────────────
    string public constant VERSION = "2.0.0";
    /// @notice Hard ceiling for the platform fee: 2_000 bps = 20%.
    uint16 public constant MAX_FEE_BPS = 2_000;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ── Custom errors (cheaper and more precise than revert strings) ───────
    error NotOperator();
    error NotPendingOperator();
    error NoPendingOperator();
    error ZeroAddress();
    error ZeroAmount();
    error LengthMismatch();
    error ContractPaused();
    error FeeTooHigh(uint16 requested, uint16 max);
    error InsufficientUserBalance(uint256 available, uint256 required);
    error InsufficientMerchantBalance(uint256 available, uint256 required);
    error InsufficientSurplus(uint256 available, uint256 requested);
    error TransferFailed();
    error ReentrantCall();

    // ── State ───────────────────────────────────────────────────────────────
    IERC20 public immutable usdc;

    address public operator;
    /// @notice Two-step operator hand-off: proposed by the operator, accepted
    ///  by the target. Prevents an accidental single-tx lock-out.
    address public pendingOperator;

    address public feeRecipient;
    /// @notice Platform fee in basis points taken from each settlement.
    ///  0 by default — settlement is fee-free until explicitly configured.
    uint16 public feeBps;
    /// @notice Fees accumulated by batchSettleUsage, withdrawable by the
    ///  fee recipient only.
    uint256 public accruedFees;

    /// @notice True while a settlement/pause is in effect. Deposits and
    ///  settlements halt; withdrawals deliberately stay open as the escape hatch.
    bool public paused;

    /// @notice Sum of all user + merchant balances + accrued fees. The ERC-20
    ///  balance of this contract must never fall below this. The difference —
    ///  if positive — is stray value and only that is sweepable.
    uint256 public totalOwed;

    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public merchantBalances;

    bool private locked;

    // ── Events ──────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    /// @param fee platform fee (bps of amount) diverted to the fee recipient
    event UsageSettled(address indexed user, address indexed merchant, uint256 amount, uint256 fee);
    event UserWithdrawn(address indexed user, uint256 amount);
    event MerchantWithdrawn(address indexed merchant, uint256 amount);
    event OperatorProposed(address indexed currentOperator, address indexed proposed);
    event OperatorAccepted(address indexed previousOperator, address indexed newOperator);
    event PauseSet(bool paused);
    event FeeSet(uint16 feeBps, address indexed feeRecipient);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event SurplusSwept(address indexed recipient, uint256 amount);

    // ── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    constructor(address _usdc) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        operator = msg.sender;
        feeRecipient = msg.sender;
    }

    // ── User functions ──────────────────────────────────────────────────────

    /// @notice Deposit USDC into your own channel balance.
    ///  Approve this contract on the USDC ERC-20 interface first.
    /// @param amount raw USDC units (6 decimals)
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        _deposit(msg.sender, amount);
    }

    /// @notice Deposit USDC on behalf of another user — lets an application
    ///  fund its end-users' channel balances directly.
    function depositFor(address user, uint256 amount) external nonReentrant whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        _deposit(user, amount);
    }

    /// @notice Withdraw unspent deposit back to your wallet. Always available,
    ///  even while the contract is paused.
    function withdrawUser(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 balance = userBalances[msg.sender];
        if (balance < amount) revert InsufficientUserBalance(balance, amount);

        unchecked {
            userBalances[msg.sender] = balance - amount;
            totalOwed -= amount;
        }
        if (!usdc.transfer(msg.sender, amount)) revert TransferFailed();
        emit UserWithdrawn(msg.sender, amount);
    }

    // ── Merchant functions ──────────────────────────────────────────────────

    /// @notice Withdraw settled earnings. Always available, even while paused.
    function withdrawMerchant(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 balance = merchantBalances[msg.sender];
        if (balance < amount) revert InsufficientMerchantBalance(balance, amount);

        unchecked {
            merchantBalances[msg.sender] = balance - amount;
            totalOwed -= amount;
        }
        if (!usdc.transfer(msg.sender, amount)) revert TransferFailed();
        emit MerchantWithdrawn(msg.sender, amount);
    }

    // ── Operator: settlement ────────────────────────────────────────────────

    /// @notice Settle metered usage in one batch: move each user's deposited
    ///  balance to the merchant, minus the platform fee. All-or-nothing by
    ///  design — the off-chain settlement engine pre-checks every user
    ///  balance on-chain before submitting, and per-item partial success
    ///  would make off-chain/chain reconciliation ambiguous.
    /// @param users  user addresses (must be lowercase/checksum-consistent with calls)
    /// @param merchants merchant payout addresses (never zero)
    /// @param amounts raw USDC units (6 decimals), all > 0
    function batchSettleUsage(
        address[] calldata users,
        address[] calldata merchants,
        uint256[] calldata amounts
    ) external onlyOperator nonReentrant whenNotPaused {
        if (users.length != merchants.length || merchants.length != amounts.length) {
            revert LengthMismatch();
        }

        for (uint256 i = 0; i < users.length; i++) {
            address u = users[i];
            address m = merchants[i];
            uint256 a = amounts[i];

            if (a == 0) revert ZeroAmount();
            if (m == address(0)) revert ZeroAddress();

            uint256 balance = userBalances[u];
            if (balance < a) revert InsufficientUserBalance(balance, a);

            uint256 fee = (a * feeBps) / BPS_DENOMINATOR;
            uint256 net = a - fee;

            userBalances[u] = balance - a;
            merchantBalances[m] += net;
            accruedFees += fee;
            // totalOwed is unchanged: user −a, merchant +net, fees +fee = a.

            emit UsageSettled(u, m, a, fee);
        }
    }

    // ── Operator: fee administration ────────────────────────────────────────

    /// @notice Configure the platform fee. feeBps = 0 disables fees entirely.
    ///  Hard-capped at MAX_FEE_BPS (20%) so the role can never quietly take more.
    function setFee(uint16 bps, address recipient) external onlyOperator {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh(bps, MAX_FEE_BPS);
        if (recipient == address(0)) revert ZeroAddress();
        feeBps = bps;
        feeRecipient = recipient;
        emit FeeSet(bps, recipient);
    }

    /// @notice Withdraw accrued platform fees to the fee recipient.
    function withdrawFees() external onlyOperator nonReentrant {
        uint256 amount = accruedFees;
        if (amount == 0) revert ZeroAmount();

        accruedFees = 0;
        totalOwed -= amount;
        if (!usdc.transfer(feeRecipient, amount)) revert TransferFailed();
        emit FeesWithdrawn(feeRecipient, amount);
    }

    // ── Operator: safety controls ───────────────────────────────────────────

    /// @notice Emergency brake: halts deposits and settlements. Withdrawals
    ///  stay open so users and merchants can always exit.
    function setPaused(bool value) external onlyOperator {
        paused = value;
        emit PauseSet(value);
    }

    /// @notice Step 1/2 of the operator hand-off.
    function proposeOperator(address newOperator) external onlyOperator {
        if (newOperator == address(0) || newOperator == operator) revert ZeroAddress();
        pendingOperator = newOperator;
        emit OperatorProposed(operator, newOperator);
    }

    /// @notice Step 2/2 — only the proposed address can accept the role.
    function acceptOperator() external {
        address proposed = pendingOperator;
        if (proposed == address(0)) revert NoPendingOperator();
        if (msg.sender != proposed) revert NotPendingOperator();

        emit OperatorAccepted(operator, proposed);
        operator = proposed;
        pendingOperator = address(0);
    }

    // ── Stray-value recovery ────────────────────────────────────────────────

    /// @notice Sweep ONLY stray value (e.g. forced native-USDC sends, airdrops)
    ///  — capped at the contract's ERC-20 balance minus everything owed to
    ///  users, merchants, and fees. User funds are mathematically unreachable
    ///  through this function.
    function sweepSurplus(address recipient, uint256 amount) external onlyOperator nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 surplus = usdc.balanceOf(address(this)) - totalOwed;
        if (surplus < amount) revert InsufficientSurplus(surplus, amount);

        if (!usdc.transfer(recipient, amount)) revert TransferFailed();
        emit SurplusSwept(recipient, amount);
    }

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Total liabilities: user balances + merchant balances + accrued
    ///  fees. `usdc.balanceOf(this) - totalLiabilities()` is the sweepable surplus.
    function totalLiabilities() external view returns (uint256) {
        return totalOwed;
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /// @dev Checks-effects-interactions: credit the ledger first, then pull
    ///  the tokens. A failing transferFrom reverts the whole transaction.
    function _deposit(address user, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();

        userBalances[user] += amount;
        totalOwed += amount;
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Deposited(user, amount);
    }
}
