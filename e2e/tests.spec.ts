import { test, BrowserContext, Page, chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import * as fs from 'fs/promises';
import { createPreFundedWallet, findAndClickHighestSharedButton, registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin } from './testUtils';
import { cp } from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Helper function to handle MetaMask network switching and confirmation
// Helper function to handle MetaMask network switching and confirmation
// async function handleMetaMaskNetworkAndConfirm(context: BrowserContext, shouldSwitchNetwork: boolean = true): Promise<void> {
//   try {
//     // Wait for MetaMask page to be available
//     await context.waitForEvent('page', { timeout: 10000 });
    
//     // Get the most recent MetaMask page
//     const metaMaskPage: Page = context.pages().find(page => page.url().includes('extension')) || context.pages()[1];
    
//     // Check if page is still open
//     if (metaMaskPage.isClosed()) {
//       console.log("MetaMask page was closed, skipping confirmation");
//       return;
//     }
    
//     if (shouldSwitchNetwork) {
//       try {
//         await metaMaskPage.getByText("Sepolia").waitFor({ state: 'visible', timeout: 5000 });
//         await metaMaskPage.waitForSelector('[data-testid="page-container-footer-next"]', { state: 'visible', timeout: 5000 });
//         await metaMaskPage.click('[data-testid="page-container-footer-next"]');
//       } catch (error) {
//         console.log("Network switch not required or already completed");
//       }
//     }
    
//     // Wait for confirm button and click it
//     await metaMaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 15000 });
//     await metaMaskPage.click('[data-testid="confirm-footer-button"]');
    
//     // Wait for the MetaMask page to close or navigate away
//     await metaMaskPage.waitForEvent('close').catch(() => {
//       console.log("MetaMask page didn't close as expected, continuing...");
//     });
    
//   } catch (error) {
//     console.error("Error in handleMetaMaskNetworkAndConfirm:", error);
//     throw error;
//   }
// }
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
      await context.waitForEvent('page', { timeout: 10000 });
      metaMaskPage = context.pages().find(page => page.url().includes('extension')) || context.pages()[1];
    }
    
    console.log("Current MetaMask page URL:", metaMaskPage.url());
    
    // Wait for any content to load
    await metaMaskPage.waitForLoadState('domcontentloaded');
    
    // Handle different possible states in sequence
    const maxAttempts = 3;
    let currentAttempt = 0;
    
    while (currentAttempt < maxAttempts) {
      try {
        // Check for network permission dialog
        const permissionButton = metaMaskPage.locator('[data-testid="page-container-footer-next"]');
        if (await permissionButton.isVisible()) {
          console.log(`Attempt ${currentAttempt + 1}: Network permission dialog found`);
          await permissionButton.click();
          await metaMaskPage.waitForTimeout(2000);
          currentAttempt++;
          continue;
        }
        
        // Check for network switch dialog
        if (shouldSwitchNetwork) {
          const sepoliaText = metaMaskPage.getByText("Sepolia");
          if (await sepoliaText.isVisible()) {
            console.log(`Attempt ${currentAttempt + 1}: Network switch dialog found`);
            const switchButton = metaMaskPage.locator('[data-testid="page-container-footer-next"]');
            if (await switchButton.isVisible()) {
              await switchButton.click();
              await metaMaskPage.waitForTimeout(3000);
              currentAttempt++;
              continue;
            }
          }
        }
        
        // Check for final confirm button
        const confirmButton = metaMaskPage.locator('[data-testid="confirm-footer-button"]');
        if (await confirmButton.isVisible()) {
          console.log(`Attempt ${currentAttempt + 1}: Final confirm button found`);
          await confirmButton.click();
          console.log("Transaction confirmed successfully");
          break;
        }
        
        // If none of the expected elements are found, wait and try again
        console.log(`Attempt ${currentAttempt + 1}: No expected elements found, waiting...`);
        await metaMaskPage.waitForTimeout(2000);
        currentAttempt++;
        
      } catch (error) {
        console.log(`Attempt ${currentAttempt + 1} failed:`, error);
        currentAttempt++;
        await metaMaskPage.waitForTimeout(1000);
      }
    }
    
    // Wait for the MetaMask page to close or navigate away
    await metaMaskPage.waitForEvent('close').catch(() => {
      console.log("MetaMask page didn't close as expected, continuing...");
    });
    
  } catch (error) {
    console.error("Error in handleMetaMaskNetworkAndConfirmRobust:", error);
    throw error;
  }
}



// Helper function to upload a file
async function uploadFile(page: Page, filePath: string, dropzoneSelector: string = '[data-testid="file-upload-dropzone"]'): Promise<void> {
  console.log("Waiting for file upload dropzone to be visible...");
  await page.waitForSelector(dropzoneSelector, { state: 'visible', timeout: 10000 });
  console.log("File upload dropzone is visible");

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click(dropzoneSelector);
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  
  console.log("File uploaded successfully");
}

// Helper function to wait for MetaMask popup and return the page
async function waitForMetaMaskPopup(context: BrowserContext): Promise<Page> {
  const metaMaskPromise = context.waitForEvent("page");
  await metaMaskPromise;
  return context.pages()[1];
}

// Helper function to close upload dialog
async function closeUploadDialog(page: Page): Promise<void> {
  console.log("Waiting for clear completed button to appear...");
  await page.waitForSelector('[data-testid="clear-completed-button"]', { state: 'visible', timeout: 10000 });
  await page.click('[data-testid="clear-completed-button"]');

  console.log("Waiting for close upload dialog to appear");
  await page.waitForSelector('[data-testid="close-upload-dialog-button"]', { state: 'visible', timeout: 10000 });
  await page.click('[data-testid="close-upload-dialog-button"]');
  
  console.log("Clicked close upload dialog button");
}


async function fundWalletFromFaucet(walletAddress: string): Promise<void> {
  const faucetUrl = 'https://sepoliafaucet.com/';
  
  try {
    // You can use playwright to automate faucet funding
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(faucetUrl);
    await page.fill('input[placeholder*="address"]', walletAddress);
    await page.click('button[type="submit"]');
    
    // Wait for funding to complete
    await page.waitForTimeout(30000); // Wait 30 seconds
    
    await browser.close();
    console.log(`Funded wallet ${walletAddress} from faucet`);
  } catch (error) {
    console.error('Error funding wallet from faucet:', error);
  }
}
// Helper function to sign a document
async function witnessDocument(page: Page, context: BrowserContext): Promise<void> {
 await page.waitForTimeout(7000); // Wait 5 seconds instead of 2
  
  console.log("Waiting for witness button to appear...");
  await page.waitForSelector('[data-testid="witness-action-button"]', { state: 'visible', timeout: 10000 });
  console.log("Witness button is visible");

  // Check if MetaMask page already exists
  const existingMetaMaskPage = context.pages().find(page => page.url().includes('extension'));
  
  if (existingMetaMaskPage) {
    console.log("MetaMask page already exists, using existing page");
    await page.click('[data-testid="witness-action-button"]');
    await handleMetaMaskNetworkAndConfirm(context, true, existingMetaMaskPage);
  } else {
    console.log("Waiting for new MetaMask page...");
    const metaMaskPromise = context.waitForEvent("page");
    await page.click('[data-testid="witness-action-button"]');
    console.log("Clicked sign button, waiting for MetaMask popup...");
    
    await metaMaskPromise;
    await handleMetaMaskNetworkAndConfirm(context, true);
  }
}

// Helper function to sign a document
async function signDocument(page: Page, context: BrowserContext): Promise<void> {
  console.log("Waiting for sign button to appear...");
  await page.waitForSelector('[data-testid="sign-action-button"]', { state: 'visible', timeout: 10000 });
  console.log("Sign button is visible");

  const metaMaskPromise = context.waitForEvent("page");
  await page.click('[data-testid="sign-action-button"]');
  console.log("Clicked sign button, waiting for MetaMask popup...");

  await metaMaskPromise;
  await handleMetaMaskNetworkAndConfirm(context, true);
}

// Helper function to download aqua tree
async function downloadAquaTree(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="download-aqua-tree-button"]', { state: 'visible' });
  await page.click('[data-testid="download-aqua-tree-button"]');
  console.log("Download completed");
}

// Helper function to create aqua sign form
async function createAquaSignForm(page: Page, context: BrowserContext, filePath: string): Promise<void> {
  await page.click('[data-testid="create-document-signature"]');
  console.log("clicked aqua sign");

  // Upload document
  await uploadFile(page, filePath, '[data-testid="input-document"]');

  // Configure signers
  await page.click('[data-testid="multiple_values_signers"]');
  console.log("clicked multiple values signers");

  const metaMaskAdr: string = await page.locator('[data-testid="input-sender"]').inputValue();
  await page.fill('[data-testid="input-signers-0"]', metaMaskAdr);
  console.log("filled aqua sign form");

  // Submit form and handle MetaMask
  const metamaskPromise = context.waitForEvent("page");
  await page.click('[type="submit"]');
  await metamaskPromise;

  await handleMetaMaskNetworkAndConfirm(context, true);
}

// Helper function to handle signature creation and saving
async function createAndSaveSignature(page: Page, context: BrowserContext): Promise<void> {
  await page.getByText("Create Signature").waitFor({ state: 'visible' });
  await page.getByText("Create Signature").click();
  console.log("created signature");

  await page.getByText("Save Signature").waitFor({ state: 'visible' });
  await page.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
  await page.click('[class="signature-canvas"]');

  const metamaskPromise = context.waitForEvent("page");
  await page.getByText("Save Signature").click();
  await metamaskPromise;

  await handleMetaMaskNetworkAndConfirm(context, false);
  console.log("signature saved");
}

// Helper function to add signature to document
async function addSignatureToDocument(page: Page, context: BrowserContext): Promise<void> {
  await page.getByText("Add Signature to document").waitFor({ state: 'visible' });
  await page.getByText("Add Signature to document").click();
  console.log("Add Signature to document");

  await page.waitForSelector('[data-testid="pdf-canvas"]', { state: 'visible' });
  await page.click('[data-testid="pdf-canvas"]');
  console.log("Signature added to document");

  const metamaskPromise = context.waitForEvent("page");
  await page.getByText("Sign document").click();
  console.log("Sign document button clicked");
  
  await metamaskPromise;
  await handleMetaMaskNetworkAndConfirm(context, false);
}

//prepare metamask
test.beforeAll(async (): Promise<void> => {
  const url: string = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Base URL: ${url}`);
});

test("create new wallet test", async (): Promise<void> => {
  await registerNewMetaMaskWallet();
});

test("login test", async (): Promise<void> => {
  await registerNewMetaMaskWalletAndLogin();
});

test("witness test", async (): Promise<void> => {
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];
  console.log("witness test");
});

test("upload, sign, download", async (): Promise<void> => {
  test.setTimeout(80000); // Increase timeout to 80 seconds
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("upload, sign, download started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(testPage, filePath);
  
  // Wait for file processing
  await testPage.waitForTimeout(2000);
  
  // Close upload dialog
  await closeUploadDialog(testPage);

  // Sign document
  await signDocument(testPage, context);

  // Download
  await downloadAquaTree(testPage);

  console.log("upload, sign, download finished!");
});


test("upload, witness, download", async (): Promise<void> => {
  test.setTimeout(80000); // Increase timeout to 80 seconds
  const registerResponse = await createPreFundedWallet()//await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext =  registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("Fund wallet ");
//  await fundWalletFromFaucet(registerResponse.walletAddress)

  console.log("upload, witness, download started!");



  // Upload file
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(testPage, filePath);
  
  // Wait for file processing
  await testPage.waitForTimeout(2000);
  
  // Close upload dialog
  await closeUploadDialog(testPage);

  // Sign document
  await witnessDocument(testPage, context);

  // Download
  await downloadAquaTree(testPage);

  console.log("upload, sign, download finished!");
});

test("single user aqua-sign", async (): Promise<void> => {
  test.setTimeout(80000); // Increase timeout to 80 seconds
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("single user aqua-sign started!");

  // Create aqua sign form
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await createAquaSignForm(testPage, context, filePath);

  // Open workflow
  await testPage.getByText("Open Workflow").waitFor({ state: 'visible' });
  await testPage.getByText("Open Workflow").click();

  // View contract document
  await testPage.getByText("View Contract Document").waitFor({ state: 'visible' });
  await testPage.getByText("View Contract Document").click();

  // Create and save signature
  await createAndSaveSignature(testPage, context);

  // Add signature to document and sign
  await addSignatureToDocument(testPage, context);

  // Wait for completion
  await testPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });
});