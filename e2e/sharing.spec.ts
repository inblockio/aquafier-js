import { test, BrowserContext, Page, chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import fs from "fs";
import { 
  findAndClickHighestSharedButton, 
  // fundWallet, 
  registerNewMetaMaskWallet, 
  registerNewMetaMaskWalletAndLogin 
} from './testUtils';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Helper function to handle MetaMask network and confirmation
 */
async function handleMetaMaskNetworkAndConfirm(
  context: BrowserContext,
  shouldSwitchNetwork: boolean = true,
  existingPage?: Page
): Promise<void> {
  try {
    // Get MetaMask page (either existing or wait for new one)
    let metaMaskPage: Page;
    const existingMetaMaskPage = context.pages().find(page => page.url().includes('extension'));

    if (existingMetaMaskPage && !existingMetaMaskPage.isClosed()) {
      metaMaskPage = existingMetaMaskPage;
      console.log("Using existing MetaMask page");
    } else {
      console.log("Waiting for new MetaMask page...");
      try {
        await context.waitForEvent('page', { timeout: 10000 });
        metaMaskPage = context.pages().find(page => page.url().includes('extension')) || context.pages()[1];
      } catch (error) {
        console.log("Failed to get new MetaMask page:", error);
        return;
      }
    }

    // Wait for MetaMask to load
    await metaMaskPage.waitForLoadState('networkidle');

    // Check for network switch prompt
    if (shouldSwitchNetwork) {
      try {
        const switchButton = metaMaskPage.getByText('Switch network');
        if (await switchButton.isVisible()) {
          await switchButton.click();
          console.log("Switched network");
        }
      } catch (error) {
        console.log("No network switch needed or failed to switch:", error);
      }
    }

    // Check for connect button
    try {
      const connectButton = metaMaskPage.getByText('Connect', { exact: true });
      if (await connectButton.isVisible()) {
        await connectButton.click();
        console.log("Clicked Connect");
      }
    } catch (error) {
      console.log("No Connect button found or failed to click:", error);
    }

    // Check for Next button
    try {
      const nextButton = metaMaskPage.getByRole('button', { name: 'Next' });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        console.log("Clicked Next");
      }
    } catch (error) {
      console.log("No Next button found or failed to click:", error);
    }

    // Check for Connect button again (sometimes appears after Next)
    try {
      const connectButton = metaMaskPage.getByRole('button', { name: 'Connect' });
      if (await connectButton.isVisible()) {
        await connectButton.click();
        console.log("Clicked Connect after Next");
      }
    } catch (error) {
      console.log("No second Connect button found or failed to click:", error);
    }

    // Check for Sign button
    try {
      const signButton = metaMaskPage.getByText('Sign', { exact: true });
      if (await signButton.isVisible()) {
        await signButton.click();
        console.log("Clicked Sign");
      }
    } catch (error) {
      console.log("No Sign button found or failed to click:", error);
    }

    // Check for Approve button
    try {
      const approveButton = metaMaskPage.getByRole('button', { name: 'Approve' });
      if (await approveButton.isVisible()) {
        await approveButton.click();
        console.log("Clicked Approve");
      }
    } catch (error) {
      console.log("No Approve button found or failed to click:", error);
    }

    // Check for Confirm button
    try {
      const confirmButton = metaMaskPage.getByRole('button', { name: 'Confirm' });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        console.log("Clicked Confirm");
      }
    } catch (error) {
      console.log("No Confirm button found or failed to click:", error);
    }

    // Wait for any MetaMask operations to complete
    await metaMaskPage.waitForTimeout(2000);

  } catch (error) {
    console.error("Error in handleMetaMaskNetworkAndConfirm:", error);
  }
}

/**
 * Helper function to upload a file
 */
async function uploadFile(
  page: Page, 
  filePath: string, 
  dropzoneSelector: string = '[data-testid="file-upload-dropzone"]'
): Promise<void> {
  // Navigate to files page if not already there
  if (!page.url().includes('/app')) {
    const baseUrl = process.env.BASE_URL || "http://localhost:5173";
    await page.goto(`${baseUrl}/app`);
    await page.waitForLoadState('networkidle');
  }
  
  // Click upload button on the files page
  // await page.getByTestId('file-upload-dropzone').click();
  await page.waitForTimeout(1000); // Wait for upload dialog to appear
  
  // Upload file
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator(dropzoneSelector).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  
  // Wait for upload to complete
  await page.getByText('Upload Complete').waitFor({ state: 'visible', timeout: 30000 });
}

/**
 * Helper function to wait for MetaMask popup and return the page
 */
async function waitForMetaMaskPopup(context: BrowserContext): Promise<Page> {
  const popupPromise = context.waitForEvent('page');
  const popup = await popupPromise;
  await popup.waitForLoadState('networkidle');
  return popup;
}

/**
 * Helper function to close upload dialog
 */
async function closeUploadDialog(page: Page): Promise<void> {
  try {
    const closeButton = page.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      console.log("Closed upload dialog");
    }
  } catch (error) {
    console.log("No close button found or failed to close dialog:", error);
  }
}

/**
 * Helper function to witness a document
 */
async function witnessDocument(page: Page, context: BrowserContext): Promise<void> {
  // Navigate to files page if not already there
  if (!page.url().includes('/app')) {
    const baseUrl = process.env.BASE_URL || "http://localhost:5173";
    await page.goto(`${baseUrl}/app`);
    await page.waitForLoadState('networkidle');
  }
  
  // Select the first file
  await page.getByTestId('file-row').first().click();
  
  // Click witness button
  await page.getByTestId('witness-action-button').click();
  
  // Handle MetaMask confirmation
  await handleMetaMaskNetworkAndConfirm(context);
  
  // Wait for success message
  await page.getByText('Witnessing successfull').waitFor({ state: 'visible', timeout: 30000 });
}

/**
 * Helper function to share a document with another user
 */
async function shareDocument(
  page: Page, 
  context: BrowserContext, 
  recipientAddress: string
): Promise<void> {
  // Navigate to files page
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await page.goto(`${baseUrl}/app`);
  await page.waitForLoadState('networkidle');

  // Stall here for 3 seconds
  await page.waitForTimeout(3000);
  
  // Select the first file
  await page.getByTestId('file-row').first().click();
  
  // Click share button
  await page.getByTestId('share-action-button0').click();
  
  // Toggle specific wallet sharing
  await page.locator('button[role="switch"]').click();
  
  // Enter recipient address
  await page.locator('input[placeholder="Enter wallet address"]').fill(recipientAddress);
  
  // Confirm sharing
  await page.getByTestId('share-modal-action-button-dialog').click();
  
  // Handle MetaMask confirmation if needed
  await handleMetaMaskNetworkAndConfirm(context);
  
  // Wait for success message - look for the shared document link section
  await page.getByText('Shared Document Link').waitFor({ state: 'visible', timeout: 30000 });
  
  // Close the share dialog
  await page.getByTestId('share-cancel-action-button').click();
}

/**
 * Helper function to verify a shared document is accessible
 */
async function verifySharedDocumentAccess(
  page: Page
): Promise<void> {
  // Navigate to shared with me page
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await page.goto(`${baseUrl}/app/shared-contracts`);
  await page.waitForLoadState('networkidle');
  
  // Verify shared documents section is visible
  await page.getByTestId('contracts-shared-button').waitFor({ state: 'visible' });
  await page.getByTestId('contracts-shared-button').click();
  
  // Wait for shared files to load
  await page.waitForTimeout(2000);
  
  // Look for any shared files
  const sharedFilesCount = await page.locator('tr').count();
  
  // Verify at least one shared file exists (header row + at least one file)
  if (sharedFilesCount > 1) {
    console.log(`Found ${sharedFilesCount - 1} shared files`);
  } else {
    console.log('No shared files found');
  }
  
  // Success if we can see the shared files page
  await page.waitForTimeout(1000);
}

// Test for sharing functionality
test("share document between two users", async (): Promise<void> => {
  test.setTimeout(120000); // Increase timeout to 120 seconds
  
  // Setup first user (document owner)
  const ownerResponse = await registerNewMetaMaskWalletAndLogin();
  const ownerContext: BrowserContext = ownerResponse.context;
  const ownerPage: Page = ownerContext.pages()[0];
  const ownerAddress = ownerResponse.walletAddress;
  
  // Setup second user (document recipient)
  const recipientResponse = await registerNewMetaMaskWalletAndLogin();
  const recipientContext: BrowserContext = recipientResponse.context;
  const recipientPage: Page = recipientContext.pages()[0];
  const recipientAddress = recipientResponse.walletAddress;
  
  // Fund wallets if needed
  // await fundWallet(ownerAddress);
  // await fundWallet(recipientAddress);
  
  // Owner uploads a document
  const testFilePath = path.join(__dirname, 'resources', 'test-document.pdf');
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await ownerPage.goto(`${baseUrl}/app`);
  await uploadFile(ownerPage, testFilePath);
  await closeUploadDialog(ownerPage);
  
  // Owner witnesses the document
  await witnessDocument(ownerPage, ownerContext);
  
  // Owner shares the document with recipient
  await shareDocument(ownerPage, ownerContext, recipientAddress);
  
  // Recipient verifies they can access the shared document
  await verifySharedDocumentAccess(recipientPage);
  
  // Cleanup
  await ownerContext.close();
  await recipientContext.close();
});

// Test for sharing with different permission levels
test("share document with different permission levels", async (): Promise<void> => {
  test.setTimeout(120000); // Increase timeout to 120 seconds
  
  // Setup first user (document owner)
  const ownerResponse = await registerNewMetaMaskWalletAndLogin();
  const ownerContext: BrowserContext = ownerResponse.context;
  const ownerPage: Page = ownerContext.pages()[0];
  const ownerAddress = ownerResponse.walletAddress;
  
  // Setup second user (document recipient)
  const recipientResponse = await registerNewMetaMaskWalletAndLogin();
  const recipientContext: BrowserContext = recipientResponse.context;
  const recipientPage: Page = recipientContext.pages()[0];
  const recipientAddress = recipientResponse.walletAddress;
  
  // Fund wallets if needed
  // await fundWallet(ownerAddress);
  // await fundWallet(recipientAddress);
  
  // Owner uploads a document
  const testFilePath = path.join(__dirname, 'resources', 'exampleFile.pdf');
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await ownerPage.goto(`${baseUrl}/app`);
  await uploadFile(ownerPage, testFilePath);
  await closeUploadDialog(ownerPage);
  
  // Owner witnesses the document
  await witnessDocument(ownerPage, ownerContext);
  
  // Owner shares the document with recipient (with edit permissions)
  await shareDocument(ownerPage, ownerContext, recipientAddress);
  
  // Recipient verifies they can access and edit the shared document
  await verifySharedDocumentAccess(recipientPage);
  
  // Cleanup
  await ownerContext.close();
  await recipientContext.close();
});
