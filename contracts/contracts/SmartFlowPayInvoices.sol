// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartFlowPayInvoices
 * @dev Invoice-based payment system for stablecoins (BEP20/ERC20) on BNB Chain
 * @notice Merchants can create invoices, customers pay them, and merchants withdraw funds
 */
contract SmartFlowPayInvoices is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Invoice {
        bytes32 invoiceId;
        address merchant;
        address token;
        uint256 amount;
        string note;
        uint256 createdAt;
        uint256 expiresAt;
        bool paid;
        address payer;
        uint256 paidAt;
    }

    mapping(bytes32 => Invoice) public invoices;
    mapping(address => mapping(address => uint256)) public merchantBalances;
    mapping(address => uint256) private merchantNonces;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address token,
        uint256 amount,
        string note,
        uint256 expiresAt
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 amount
    );

    event Withdrawal(
        address indexed merchant,
        address indexed to,
        address token,
        uint256 amount
    );

    error InvoiceAlreadyExists();
    error InvoiceNotFound();
    error InvoiceAlreadyPaid();
    error InvoiceExpired();
    error InvalidAmount();
    error InvalidToken();
    error InsufficientBalance();
    error InvalidRecipient();

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new invoice for payment
     * @param token The ERC20 token address for payment
     * @param amount The amount to be paid
     * @param note A note or order ID for the invoice
     * @param expiresAt Expiration timestamp (0 for no expiration)
     * @return invoiceId The unique identifier for the invoice
     */
    function createInvoice(
        address token,
        uint256 amount,
        string calldata note,
        uint256 expiresAt
    ) external returns (bytes32 invoiceId) {
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvoiceExpired();

        uint256 nonce = merchantNonces[msg.sender]++;
        
        invoiceId = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                amount,
                note,
                block.timestamp,
                nonce
            )
        );

        if (invoices[invoiceId].merchant != address(0)) revert InvoiceAlreadyExists();

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            merchant: msg.sender,
            token: token,
            amount: amount,
            note: note,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            paid: false,
            payer: address(0),
            paidAt: 0
        });

        emit InvoiceCreated(invoiceId, msg.sender, token, amount, note, expiresAt);
    }

    /**
     * @dev Pays an invoice by transferring tokens from payer to contract
     * @param invoiceId The unique identifier of the invoice to pay
     */
    function payInvoice(bytes32 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
        if (invoice.paid) revert InvoiceAlreadyPaid();
        if (invoice.expiresAt != 0 && block.timestamp > invoice.expiresAt) revert InvoiceExpired();

        invoice.paid = true;
        invoice.payer = msg.sender;
        invoice.paidAt = block.timestamp;

        merchantBalances[invoice.merchant][invoice.token] += invoice.amount;

        IERC20(invoice.token).safeTransferFrom(msg.sender, address(this), invoice.amount);

        emit InvoicePaid(
            invoiceId,
            invoice.merchant,
            msg.sender,
            invoice.token,
            invoice.amount
        );
    }

    /**
     * @dev Withdraws tokens from merchant balance
     * @param token The ERC20 token address to withdraw
     * @param amount The amount to withdraw
     * @param to The recipient address
     */
    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external nonReentrant {
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (merchantBalances[msg.sender][token] < amount) revert InsufficientBalance();

        merchantBalances[msg.sender][token] -= amount;

        IERC20(token).safeTransfer(to, amount);

        emit Withdrawal(msg.sender, to, token, amount);
    }

    /**
     * @dev Gets all invoice details
     * @param invoiceId The unique identifier of the invoice
     * @return Invoice struct with all fields
     */
    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    /**
     * @dev Gets merchant balance for a specific token
     * @param merchant The merchant address
     * @param token The token address
     * @return balance The merchant's balance
     */
    function getMerchantBalance(
        address merchant,
        address token
    ) external view returns (uint256) {
        return merchantBalances[merchant][token];
    }

    /**
     * @dev Gets the current nonce for a merchant (useful for predicting invoiceId)
     * @param merchant The merchant address
     * @return nonce The current nonce
     */
    function getMerchantNonce(address merchant) external view returns (uint256) {
        return merchantNonces[merchant];
    }
}
