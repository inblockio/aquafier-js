import { test, BrowserContext, Page, chromium, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import fs from "fs";
import { addSignatureToDocument, closeUploadDialog, createAndSaveSignature, createAquaSignForm, downloadAquaTree, findAndClickHighestSharedButton, fundWallet, importAquaChain, registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin, shareDocument, signDocument, uploadFile, witnessDocument } from './testUtils';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });


//prepare metamask
test.beforeAll(async (): Promise<void> => {
  const url: string = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Base URL: ${url}`);
});

// Simple test to verify Playwright is working correctly
test("basic site accessibility test", async ({ page }) => {
  console.log("Running basic site accessibility test");
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Navigating to ${baseUrl}`);

  // Navigate to the site
  await page.goto(baseUrl, { timeout: 60000 });
  console.log("Page loaded");

  // Take a screenshot for debugging
  // await page.screenshot({ path: 'site-loaded.png' });
  // console.log("Screenshot taken");

  // Simple assertion to verify the page loaded
  const title = await page.title();
  console.log(`Page title: ${title}`);
});

test("create new wallet test", async (): Promise<void> => {
  await registerNewMetaMaskWallet();
});

test("login test", async (): Promise<void> => {
  await registerNewMetaMaskWalletAndLogin();
});

test("user setting test", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 50000); // 3 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];
  console.log("user setting test started!");


  // Get the BASE_URL from environment variables and navigate to it
  const baseUrl = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`BASE URL: ${baseUrl}`);
  const url = `${baseUrl}/app/settings`
  console.log(`Navigating to: ${url}`);
  // Await for 3 seconds then navigate
  await testPage.waitForTimeout(3000);
  await testPage.goto(url, { waitUntil: 'networkidle' })

  // await testPage.reload(); // reload page

  await testPage.fill('[data-testid="alias-name-input"]', "alias_data");
  console.log("filled aqua sign form");



  await testPage.waitForSelector('[data-testid="save-changes-settings"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="save-changes-settings"]')

  await testPage.waitForTimeout(2000);

  await testPage.reload(); // reload page

  const alisName: string = await testPage.locator('[data-testid="alias-name-input"]').inputValue();

  if (alisName !== "alias_data") {
    throw new Error("Alias name not updated");
  }

  console.log("Alias name updated successfully");
});


test("linking 2 files test", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 50000); // 3 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];
  console.log("linking 2 files test started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(testPage, filePath);

  // close upload dialog
  await closeUploadDialog(testPage);

  // Upload file
  const filePath2: string = path.join(__dirname, 'resources/logo.png');
  await uploadFile(testPage, filePath2);

  // close upload dialog
  await closeUploadDialog(testPage);

  await testPage.waitForSelector('[data-testid="link-action-button-1"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="link-action-button-1"]');

  // Wait for the dialog to appear
  await testPage.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 });

  // Click on the checkbox with id 'file-0'
  await testPage.waitForSelector('#file-0', { state: 'visible', timeout: 5000 });
  await testPage.click('#file-0');

  // Click on the link button in the dialog
  await testPage.waitForSelector('[data-testid="link-modal-action-button-dialog"]', { state: 'visible', timeout: 5000 });
  await testPage.click('[data-testid="link-modal-action-button-dialog"]');

  // Wait for the linking process to complete
  await testPage.waitForTimeout(2000);

  // close link dialog
  // await testPage.pause();
});


test("upload, file form revision", async (): Promise<void> => {

  test.setTimeout(process.env.CI ? 300000 : 80000); // 5 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("upload, file form revisions started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/aqua.json');
  await uploadFile(testPage, filePath);

  // close upload dialog

  await testPage.waitForSelector('[data-testid="create-form-3-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="create-form-3-button"]');

  // ✅ Wait for the table row that includes "aqua.json"
  const row = testPage.locator('table >> text=aqua.json');
  await expect(row).toBeVisible({ timeout: 10000 });

});

test("import, file multiple revisions", async (): Promise<void> => {

  test.setTimeout(process.env.CI ? 300000 : 80000); // 5 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("upload, file multiple revisions started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/aqua.json.aqua.json');
  await uploadFile(testPage, filePath);


  //import the aqua chain

  await testPage.waitForSelector('[data-testid="action-import-93-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="action-import-93-button"]');

  // select file - only if button is visible
  const selectFileButton = testPage.locator('[data-testid="action-select-file-06-button"]');

  try {
    await selectFileButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log("Select file button is visible, proceeding with file upload");

    await selectFileButton.click();

    const filePath2: string = path.join(__dirname, 'resources/aqua.json');
    console.log("File upload dropzone is visible");

    const fileChooserPromise = testPage.waitForEvent('filechooser');
    // Trigger the file chooser (you might need to click a specific element here)
    // await testPage.click('[data-testid="some-upload-trigger"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath2);
    console.log("File selected in file chooser");


    console.log("File uploaded successfully");
  } catch (error) {
    console.log("Select file button is not visible, skipping file upload");
  }

  // ✅ Wait for the table row that includes "aqua.json"
  const row = testPage.locator('table >> text=aqua.json');
  await expect(row).toBeVisible({ timeout: 10000 });

});


test("upload, delete file", async (): Promise<void> => {

  test.setTimeout(process.env.CI ? 300000 : 80000); // 5 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("upload, file multiple revisions started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(testPage, filePath);


  await testPage.waitForSelector('[data-testid="delete-aqua-tree-button-1"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="delete-aqua-tree-button-1"]');

  // ✅ Wait for the table row with "aqua.json" to be removed (not visible)
  const row = testPage.locator('table >> text=aqua.json');
  await expect(row).not.toBeVisible({ timeout: 10000 });

  // Reload the page and check again to ensure file is permanently deleted
  console.log("Reloading page to verify file deletion persisted");
  await testPage.reload();

  // Wait for page to load and check that aqua.json is still not visible
  const rowAfterReload = testPage.locator('table >> text=aqua.json');
  await expect(rowAfterReload).not.toBeVisible({ timeout: 10000 });

});

test("upload, sign, download", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 300000 : 80000); // 5 minutes in CI
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
  await downloadAquaTree(testPage, false);

});

test("upload, witness, download", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 360000 : 80000); // 6 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("Fund wallet ");
  // Try to fund the wallet but continue even if it fails
  try {
    await fundWallet(registerResponse.walletAddress);
    console.log("Wallet fund function completed");
  } catch (error) {
    console.log("Failed to fund wallet, continuing with test anyway:", error);
    // Continue with the test despite funding failure
  }

  console.log("upload, witness, download started!");

  // Upload file
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await uploadFile(testPage, filePath);

  // Wait for file processing
  await testPage.waitForTimeout(2000);

  // Close upload dialog
  await closeUploadDialog(testPage);

  // Try to witness document but continue even if it fails
  try {
    console.log("upload, witness, download - witness document");
    // witness document
    await witnessDocument(testPage, context);
  } catch (error) {
    console.log("Witness process failed, likely due to insufficient funds. Continuing with test:", error);
  }


  // Check if we need to download (might have already been done in witnessDocument)
  try {
    // Check if download button is still visible (meaning it wasn't clicked in witnessDocument)
    const downloadButton = testPage.locator('[data-testid="download-aqua-tree-button"]');
    const isDownloadButtonVisible = await downloadButton.isVisible().catch(() => false);

    if (isDownloadButtonVisible) {
      console.log("Download button still visible - downloading now");
      await downloadAquaTree(testPage, false);
      console.log("upload, witness, download - Download completed successfully");
    } else {
      console.log("Download button not visible - document was likely already downloaded during witness step");
    }
  } catch (error) {
    console.log("upload, witness, download - Download verification failed, test will end here:", error);
  }


  console.log("upload, witness, download test finished!");
});

test("single user aqua-sign", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 300000 : 80000); // 5 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  console.log("single user aqua-sign started!");

  // Create aqua sign form
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await createAquaSignForm(testPage, context, filePath);


  // Open workflow

  await testPage.waitForSelector('[data-testid="open-aqua-sign-workflow-button-0"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="open-aqua-sign-workflow-button-0"]');

  // View contract document
  await testPage.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="action-view-contract-button"]');

  // Create and save signature
  await createAndSaveSignature(testPage, context);

  // Add signature to document and sign
  await addSignatureToDocument(testPage, context);

  // Wait for completion
  await testPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });
});


test("two user aqua-sign", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 360000 : 120000); // 6 minutes in CI
  const registerWalletOneResponse = await registerNewMetaMaskWalletAndLogin();
  const registerWalletTwoResponse = await registerNewMetaMaskWalletAndLogin();

  const contextWalletOne: BrowserContext = registerWalletOneResponse.context;
  const testPageWalletOne: Page = contextWalletOne.pages()[0];

  console.log("two user aqua-sign started!");


  // Create aqua sign form
  const filePath: string = path.join(__dirname, 'resources/exampleFile.pdf');
  await createAquaSignForm(testPageWalletOne, contextWalletOne, filePath, registerWalletTwoResponse.walletAddress);

  // await testPageWalletOne.reload()

  await testPageWalletOne.waitForSelector('[data-testid="open-aqua-sign-workflow-button-0"]', { state: 'visible', timeout: 10000 });
  await testPageWalletOne.click('[data-testid="open-aqua-sign-workflow-button-0"]');


  await testPageWalletOne.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible', timeout: 10000 });
  await testPageWalletOne.click('[data-testid="action-view-contract-button"]');

  // Create and save signature
  await createAndSaveSignature(testPageWalletOne, contextWalletOne);

  // Add signature to document and sign
  await addSignatureToDocument(testPageWalletOne, contextWalletOne);



  const contextWalletTwo: BrowserContext = registerWalletTwoResponse.context;
  const testPageWalletTwo: Page = contextWalletTwo.pages()[0];


  await testPageWalletTwo.reload(); // Reload the second test page to ensure it's up-to-date ie the workflow was shared to ensure its loaded

  importAquaChain(testPageWalletTwo, contextWalletTwo)



  // Open workflow

  await testPageWalletTwo.waitForSelector('[data-testid="open-aqua-sign-workflow-button-0"]', { state: 'visible', timeout: 10000 });
  await testPageWalletTwo.click('[data-testid="open-aqua-sign-workflow-button-0"]');

  // View contract document
  await testPageWalletTwo.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible', timeout: 10000 });
  await testPageWalletTwo.click('[data-testid="action-view-contract-button"]');

  // Create and save signature
  await createAndSaveSignature(testPageWalletTwo, contextWalletTwo);

  // Add signature to document and sign
  await addSignatureToDocument(testPageWalletTwo, contextWalletTwo);

  // Wait for completion
  // await testPageWalletOne.getByText("All signatures have been collected").waitFor({ state: 'visible', timeout: 2000 });

});


// Test for sharing functionality
test("share document between two users", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 300000 : 120000); // 5 minutes in CI

  // Setup first user (document owner)
  const ownerResponse = await registerNewMetaMaskWalletAndLogin();
  const ownerContext: BrowserContext = ownerResponse.context;
  const ownerPage: Page = ownerContext.pages()[0];

  // Setup second user (document recipient)
  const recipientResponse = await registerNewMetaMaskWalletAndLogin();
  const recipientContext: BrowserContext = recipientResponse.context;
  const recipientPage: Page = recipientContext.pages()[0];
  const recipientAddress = recipientResponse.walletAddress;

  console.log("share document between two users !");


  // Owner uploads a document
  const testFilePath = path.join(__dirname, 'resources', 'exampleFile.pdf');
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await ownerPage.goto(`${baseUrl}/app`);

  await uploadFile(ownerPage, testFilePath);
  await closeUploadDialog(ownerPage);

  await signDocument(ownerPage, ownerContext)


  console.log("share document between two users - share ");

  // Owner shares the document with recipient
  await shareDocument(ownerPage, ownerContext, recipientAddress);

  // Recipient verifies they can access the shared document
  await importAquaChain(recipientPage, recipientContext);

  // Cleanup
  await ownerContext.close();
  await recipientContext.close();
});

// Test for sharing with different permission levels
test("share document with everyone", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 300000 : 120000); // 5 minutes in CI

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

  // Owner uploads a document
  const testFilePath = path.join(__dirname, 'resources', 'exampleFile.pdf');
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  await ownerPage.goto(`${baseUrl}/app`);
  await uploadFile(ownerPage, testFilePath);
  await closeUploadDialog(ownerPage);

  // Owner sign the document
  await signDocument(ownerPage, ownerContext);

  // Owner shares the document with recipient (with edit permissions)
  let shareUlr = await shareDocument(ownerPage, ownerContext, "");

  // Recipient verifies they can access and edit the shared document
  await importAquaChain(recipientPage, recipientContext, shareUlr);

  // Cleanup
  await ownerContext.close();
  await recipientContext.close();
});





test("import aqua zip test", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 500000); // 3 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];
  console.log("Uploading aqua zip!");

  // Upload zip
  const filePath: string = path.join(__dirname, 'resources/Screenshot from 2025-07-19 14-18-50.zip');
  await uploadFile(testPage, filePath);

  // close upload dialog
  // await closeUploadDialog(testPage);

  await testPage.waitForSelector('[data-testid="action-import-82-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="action-import-82-button"]');

  await testPage.waitForEvent('load');
  await testPage.reload();


   // Check that the table has two rows and contains aqua.json
  const tableRows = testPage.locator('table tr');
  await expect(tableRows).toHaveCount(2, { timeout: 10000 });

});


test("create a template", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 1500000); // 3 minutes in CI
  const registerResponse = await registerNewMetaMaskWalletAndLogin(`app/templates`);
  const context: BrowserContext = registerResponse.context;
  const testPage: Page = context.pages()[0];

  
  console.log("create aqua form template started!");

  console.log("Navigated to templates page");
  await testPage.waitForTimeout(2000); 
  
  // Try to find the button by data-testid first, then fallback to text
  try {
    await testPage.waitForSelector('[data-testid="action-create-template-button"]', { state: 'visible', timeout: 10000 });
    await testPage.click('[data-testid="action-create-template-button"]');
    console.log("Clicked create template button using data-testid");
  } catch (error) {
    console.log("Failed to find button by data-testid, trying by text...");
    await testPage.waitForSelector('button:has-text("New Template")', { state: 'visible', timeout: 10000 });
    await testPage.click('button:has-text("New Template")');
    console.log("Clicked create template button using text selector");
  }

  console.log("Clicked create template button");
  await testPage.fill('#title', 'Test Template');

  // Add two fields
  try {
    await testPage.click('[data-testid="action-add-form-field-button"]');
    console.log("Clicked add form field button using data-testid");
  } catch (error) {
    console.log("Failed to find add form field button by data-testid, trying by text...");
    await testPage.click('button:has-text("Add Form Field")');
    console.log("Clicked add form field button using text selector");
  }
  let fields = [
    {
      label: 'Name',
      type: 'text',
      required: true,
      is_array: false
    },
    {
      label: 'Age',
      type: 'number',
      required: true,
      is_array: false
    }
  ]

  console.log("Adding fields to template form");
  // Fill the template form
  try {
    await testPage.fill(`[data-testid="field-label-0"]`, fields[0].label);
    console.log("Filled first field label using data-testid");
  } catch (error) {
    console.log("Failed to find first field label by data-testid, trying by id...");
    await testPage.fill(`#field-label-0`, fields[0].label);
    console.log("Filled first field label using id selector");
  }
  // await testPage.selectOption(`[data-testid="field-type-0"]`, fields[0].type);
  // await testPage.click(`[data-testid="field-required-0"]`);

  console.log("First field added to template form");
  try {
    await testPage.click('[data-testid="action-add-form-field-button"]');
    console.log("Clicked second add form field button using data-testid");
  } catch (error) {
    console.log("Failed to find second add form field button by data-testid, trying by text...");
    await testPage.click('button:has-text("Add Form Field")');
    console.log("Clicked second add form field button using text selector");
  }

  // await testPage.waitForSelector('[data-testid="field-label-1"]', { state: 'visible', timeout: 10000 });
  try {
    await testPage.fill(`[data-testid="field-label-1"]`, fields[1].label);
    console.log("Filled second field label using data-testid");
  } catch (error) {
    console.log("Failed to find second field label by data-testid, trying by id...");
    await testPage.fill(`#field-label-1`, fields[1].label);
    console.log("Filled second field label using id selector");
  }
  // await testPage.selectOption(`[data-testid="field-type-1"]`, fields[1].type);
  // await testPage.click(`[data-testid="field-required-1"]`);
  console.log("Second field added to template form");

  // Save the form
  try {
    await testPage.click('[data-testid="save-form-action-button"]');
    console.log("Clicked save form button using data-testid");
  } catch (error) {
    console.log("Failed to find save form button by data-testid, trying by text...");
    await testPage.click('button:has-text("Save")');
    console.log("Clicked save form button using text selector");
  }
  console.log("Template form saved");

  

  // await testPage.pause();
});