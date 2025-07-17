import { test, BrowserContext, Page } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import fs from "fs";
import { 
  addSignatureToDocument, 
  closeUploadDialog, 
  createAndSaveSignature, 
  createAquaSignForm, 
  downloadAquaTree, 
  findAndClickHighestSharedButton, 
  fundWallet, 
  importAquaChain, 
  registerNewMetaMaskWallet, 
  handleMetaMaskNetworkAndConfirm,
  shareDocument, 
  signDocument, 
  uploadFile, 
  witnessDocument 
} from './testUtils';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Global wallet storage to reuse across tests
type WalletContext = {
  context: BrowserContext;
  walletAddress: string;
  page: Page;
};

// Store for reusable wallets
const wallets: {
  owner?: WalletContext;
  recipient?: WalletContext;
} = {};

// Setup - Create wallets once before all tests
test.beforeAll(async () => {
  // Increase timeout for wallet creation
  test.setTimeout(120000); // 2 minutes
  const url: string = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Base URL: ${url}`);
  
  // Create owner wallet
  console.log('Creating owner wallet...');
  const ownerResponse = await registerNewMetaMaskWallet();
  const ownerContext = ownerResponse.context;
  const ownerPage = ownerContext.pages()[0];
  await ownerPage.waitForLoadState("load");
  
  // Navigate to app
  await ownerPage.goto(`${url}/app`, { waitUntil: 'networkidle' });
  
    try {
    // Store owner wallet
    wallets.owner = {
      context: ownerContext,
      walletAddress: ownerResponse.walletAddress,
      page: ownerPage
    };
    
    console.log(`Owner wallet created: ${ownerResponse.walletAddress}`);
    
    // Create recipient wallet
    console.log('Creating recipient wallet...');
    const recipientResponse = await registerNewMetaMaskWallet();
    const recipientContext = recipientResponse.context;
    const recipientPage = recipientContext.pages()[0];
    await recipientPage.waitForLoadState("load");
    
    // Navigate to app
    await recipientPage.goto(`${url}/app`, { waitUntil: 'networkidle' });
    
    // Store recipient wallet
    wallets.recipient = {
      context: recipientContext,
      walletAddress: recipientResponse.walletAddress,
      page: recipientPage
    };
    
    console.log(`Recipient wallet created: ${recipientResponse.walletAddress}`);
  } catch (error) {
    console.error('Error creating wallets:', error);
    throw error; // Re-throw to fail the test
  }
  
  // Fund wallets if needed
  try {
    await fundWallet(wallets.owner.walletAddress);
    await fundWallet(wallets.recipient.walletAddress);
  } catch (error) {
    console.log('Funding wallets failed, continuing anyway:', error);
  }
});

// Cleanup after all tests
test.afterAll(async () => {
  // Close browser contexts
  if (wallets.owner?.context) {
    await wallets.owner.context.close();
  }
  if (wallets.recipient?.context) {
    await wallets.recipient.context.close();
  }
});

// Helper function to refresh a page
async function refreshPage(wallet: WalletContext): Promise<void> {
  await wallet.page.reload();
  await wallet.page.waitForLoadState('networkidle');
}

// Test: User settings
test("optimized user setting test", async () => {
  test.setTimeout(60000);
  
  if (!wallets.owner) {
    throw new Error("Owner wallet not initialized");
  }
  
  const { page } = wallets.owner;
  console.log("User setting test started!");
  
  // Navigate to settings
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  const url = `${baseUrl}/app/settings`;
  console.log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Update alias name
  await page.fill('[data-testid="alias-name-input"]', "optimized_alias");
  console.log("Filled alias name input");
  
  // Save changes
  await page.waitForSelector('[data-testid="save-changes-settings"]', { state: 'visible', timeout: 10000 });
  await page.click('[data-testid="save-changes-settings"]');
  
  await page.waitForTimeout(2000);
  
  // Verify changes persisted
  await page.reload();
  const aliasName = await page.locator('[data-testid="alias-name-input"]').inputValue();
  
  if (aliasName !== "optimized_alias") {
    throw new Error("Alias name not updated");
  }
  
  console.log("Alias name updated successfully");
});

// Test: Upload and sign document
test("optimized upload and sign", async () => {
  test.setTimeout(90000);
  
  if (!wallets.owner) {
    throw new Error("Owner wallet not initialized");
  }
  
  const { page, context } = wallets.owner;
  console.log("Upload and sign test started!");
  
  // Navigate to app
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  await page.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' });
  
  // Upload file
  const filePath = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(page, filePath);
  
  // Close upload dialog
  await closeUploadDialog(page);
  
  // Sign document
  console.log("Waiting for sign button to appear...");
  await page.waitForSelector('[data-testid="sign-action-button-0"]', { state: 'visible' });
  console.log("Sign button is visible");
  
  const metaMaskPromise = context.waitForEvent("page");
  await page.click('[data-testid="sign-action-button-0"]');
  console.log("Clicked sign button, waiting for MetaMask popup...");
  
  await metaMaskPromise;
  await handleMetaMaskNetworkAndConfirm(context, true);
  
  console.log("Document signed successfully");
});

// Test: Share document between users
test("optimized share document", async () => {
  test.setTimeout(90000);
  
  if (!wallets.owner || !wallets.recipient) {
    throw new Error("Wallets not initialized");
  }
  
  const { page: ownerPage, context: ownerContext } = wallets.owner;
  const { page: recipientPage, context: recipientContext, walletAddress: recipientAddress } = wallets.recipient;
  
  console.log("Share document test started!");
  
  // Navigate to app
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  await ownerPage.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' });
  
  // Upload a document if needed
  const testFilePath = path.join(__dirname, 'resources', 'exampleFile.pdf');
  await uploadFile(ownerPage, testFilePath);
  await closeUploadDialog(ownerPage);
  
  // Sign document if needed
  await signDocument(ownerPage, ownerContext);
  
  // Share document with recipient
  console.log(`Sharing document with recipient: ${recipientAddress}`);
  await shareDocument(ownerPage, ownerContext, recipientAddress);
  
  // Recipient verifies access
  await recipientPage.goto(`${baseUrl}/app/shared-contracts`, { waitUntil: 'networkidle' });
  await importAquaChain(recipientPage, recipientContext);
  
  console.log("Document shared and accessed successfully");
});

// Test: Two user workflow
test("optimized two user workflow", async () => {
  test.setTimeout(120000);
  
  if (!wallets.owner || !wallets.recipient) {
    throw new Error("Wallets not initialized");
  }
  
  const { page: ownerPage, context: ownerContext } = wallets.owner;
  const { page: recipientPage, context: recipientContext, walletAddress: recipientAddress } = wallets.recipient;
  
  console.log("Two user workflow test started!");
  
  // Navigate to app
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  await ownerPage.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' });
  
  // Create aqua sign form
  await ownerPage.click('[data-testid="create-document-signature"]');
  console.log("Clicked aqua sign");
  
  // Upload document
  const filePath = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(ownerPage, filePath, '[data-testid="input-document"]');
  
  // Configure signers
  await ownerPage.click('[data-testid="multiple_values_signers"]');
  console.log("Clicked multiple values signers");
  
  const ownerAddress = await ownerPage.locator('[data-testid="input-sender"]').inputValue();
  await ownerPage.fill('[data-testid="input-signers-0"]', ownerAddress);
  
  // Add recipient as signer
  await ownerPage.click('[data-testid="multiple_values_signers"]');
  await ownerPage.fill('[data-testid="input-signers-1"]', recipientAddress);
  console.log("Added both signers");
  
  // Submit form and handle MetaMask
  const metamaskPromise = ownerContext.waitForEvent("page");
  await ownerPage.click('[type="submit"]');
  await metamaskPromise;
  
  await handleMetaMaskNetworkAndConfirm(ownerContext, true);
  
  // Owner adds signature
  await createAndSaveSignature(ownerPage, ownerContext);
  await addSignatureToDocument(ownerPage, ownerContext);
  
  // Recipient accesses and signs
  await recipientPage.reload();
  await importAquaChain(recipientPage, recipientContext);
  
  // Open workflow
  await recipientPage.waitForSelector('[data-testid="open-workflow-button-0"]', { state: 'visible', timeout: 10000 });
  await recipientPage.click('[data-testid="open-workflow-button-0"]');
  
  // View contract document
  await recipientPage.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible', timeout: 10000 });
  await recipientPage.click('[data-testid="action-view-contract-button"]');
  
  // Create and save signature
  await createAndSaveSignature(recipientPage, recipientContext);
  
  // Add signature to document and sign
  await addSignatureToDocument(recipientPage, recipientContext);
  
  console.log("Two user workflow completed successfully");
});
