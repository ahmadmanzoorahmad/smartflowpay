const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartFlowPayInvoices", function () {
  let contract;
  let mockToken;
  let owner;
  let merchant;
  let payer;
  let recipient;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const INVOICE_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, merchant, payer, recipient] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock USDT", "mUSDT", INITIAL_SUPPLY);
    await mockToken.waitForDeployment();

    await mockToken.transfer(payer.address, ethers.parseEther("10000"));

    const SmartFlowPayInvoices = await ethers.getContractFactory("SmartFlowPayInvoices");
    contract = await SmartFlowPayInvoices.deploy();
    await contract.waitForDeployment();
  });

  describe("Invoice Creation", function () {
    it("should allow merchant to create an invoice", async function () {
      const tokenAddress = await mockToken.getAddress();
      const note = "Order #12345";
      const expiresAt = 0;

      const tx = await contract.connect(merchant).createInvoice(
        tokenAddress,
        INVOICE_AMOUNT,
        note,
        expiresAt
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "InvoiceCreated"
      );

      expect(event).to.not.be.undefined;

      const invoiceId = event.args.invoiceId;
      const invoice = await contract.getInvoice(invoiceId);

      expect(invoice.merchant).to.equal(merchant.address);
      expect(invoice.token).to.equal(tokenAddress);
      expect(invoice.amount).to.equal(INVOICE_AMOUNT);
      expect(invoice.note).to.equal(note);
      expect(invoice.paid).to.be.false;
    });

    it("should revert for zero amount", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        contract.connect(merchant).createInvoice(tokenAddress, 0, "Test", 0)
      ).to.be.revertedWithCustomError(contract, "InvalidAmount");
    });

    it("should revert for zero token address", async function () {
      await expect(
        contract.connect(merchant).createInvoice(ethers.ZeroAddress, INVOICE_AMOUNT, "Test", 0)
      ).to.be.revertedWithCustomError(contract, "InvalidToken");
    });
  });

  describe("Invoice Payment", function () {
    let invoiceId;
    let tokenAddress;

    beforeEach(async function () {
      tokenAddress = await mockToken.getAddress();
      const tx = await contract.connect(merchant).createInvoice(
        tokenAddress,
        INVOICE_AMOUNT,
        "Order #12345",
        0
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "InvoiceCreated"
      );
      invoiceId = event.args.invoiceId;
    });

    it("should allow payer to pay an invoice", async function () {
      await mockToken.connect(payer).approve(await contract.getAddress(), INVOICE_AMOUNT);

      const tx = await contract.connect(payer).payInvoice(invoiceId);
      await tx.wait();

      const invoice = await contract.getInvoice(invoiceId);
      expect(invoice.paid).to.be.true;
      expect(invoice.payer).to.equal(payer.address);
      expect(invoice.paidAt).to.be.gt(0);

      const merchantBalance = await contract.getMerchantBalance(merchant.address, tokenAddress);
      expect(merchantBalance).to.equal(INVOICE_AMOUNT);
    });

    it("should emit InvoicePaid event", async function () {
      await mockToken.connect(payer).approve(await contract.getAddress(), INVOICE_AMOUNT);

      await expect(contract.connect(payer).payInvoice(invoiceId))
        .to.emit(contract, "InvoicePaid")
        .withArgs(invoiceId, merchant.address, payer.address, tokenAddress, INVOICE_AMOUNT);
    });

    it("should revert if invoice already paid", async function () {
      await mockToken.connect(payer).approve(await contract.getAddress(), INVOICE_AMOUNT);
      await contract.connect(payer).payInvoice(invoiceId);

      await expect(
        contract.connect(payer).payInvoice(invoiceId)
      ).to.be.revertedWithCustomError(contract, "InvoiceAlreadyPaid");
    });

    it("should revert if invoice not found", async function () {
      const fakeInvoiceId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        contract.connect(payer).payInvoice(fakeInvoiceId)
      ).to.be.revertedWithCustomError(contract, "InvoiceNotFound");
    });
  });

  describe("Withdrawal", function () {
    let invoiceId;
    let tokenAddress;

    beforeEach(async function () {
      tokenAddress = await mockToken.getAddress();
      const tx = await contract.connect(merchant).createInvoice(
        tokenAddress,
        INVOICE_AMOUNT,
        "Order #12345",
        0
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "InvoiceCreated"
      );
      invoiceId = event.args.invoiceId;

      await mockToken.connect(payer).approve(await contract.getAddress(), INVOICE_AMOUNT);
      await contract.connect(payer).payInvoice(invoiceId);
    });

    it("should allow merchant to withdraw after payment", async function () {
      const balanceBefore = await mockToken.balanceOf(recipient.address);

      await contract.connect(merchant).withdraw(tokenAddress, INVOICE_AMOUNT, recipient.address);

      const balanceAfter = await mockToken.balanceOf(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(INVOICE_AMOUNT);

      const merchantBalance = await contract.getMerchantBalance(merchant.address, tokenAddress);
      expect(merchantBalance).to.equal(0);
    });

    it("should emit Withdrawal event", async function () {
      await expect(contract.connect(merchant).withdraw(tokenAddress, INVOICE_AMOUNT, recipient.address))
        .to.emit(contract, "Withdrawal")
        .withArgs(merchant.address, recipient.address, tokenAddress, INVOICE_AMOUNT);
    });

    it("should revert if insufficient balance", async function () {
      const excessAmount = ethers.parseEther("1000");
      
      await expect(
        contract.connect(merchant).withdraw(tokenAddress, excessAmount, recipient.address)
      ).to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });

    it("should revert for zero address recipient", async function () {
      await expect(
        contract.connect(merchant).withdraw(tokenAddress, INVOICE_AMOUNT, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidRecipient");
    });
  });

  describe("Invoice Expiration", function () {
    it("should revert payment for expired invoice", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      const latestBlock = await ethers.provider.getBlock("latest");
      const expiresAt = latestBlock.timestamp + 60;

      const tx = await contract.connect(merchant).createInvoice(
        tokenAddress,
        INVOICE_AMOUNT,
        "Expiring Order",
        expiresAt
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "InvoiceCreated"
      );
      const invoiceId = event.args.invoiceId;

      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      await mockToken.connect(payer).approve(await contract.getAddress(), INVOICE_AMOUNT);

      await expect(
        contract.connect(payer).payInvoice(invoiceId)
      ).to.be.revertedWithCustomError(contract, "InvoiceExpired");
    });
  });
});
