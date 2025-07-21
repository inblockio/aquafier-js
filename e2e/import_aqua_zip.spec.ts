import { BrowserContext, Page, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import { closeUploadDialog, registerNewMetaMaskWalletAndLogin, uploadFile } from './testUtils';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });


//prepare metamask
test.beforeAll(async (): Promise<void> => {
  const url: string = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Base URL: ${url}`);
});

// test("login test", async (): Promise<void> => {
//   await registerNewMetaMaskWalletAndLogin();
// });


test("import aqua zip test", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 50000); // 3 minutes in CI
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
  
    // Wait for the dialog to appear
    // await testPage.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 });
  
    // Click on the checkbox with id 'file-0'
    // await testPage.waitForSelector('#file-0', { state: 'visible', timeout: 5000 });
    // await testPage.click('#file-0');
  
    // Click on the link button in the dialog
    // await testPage.waitForSelector('[data-testid="link-modal-action-button-dialog"]', { state: 'visible', timeout: 5000 });
    // await testPage.click('[data-testid="link-modal-action-button-dialog"]');
  
    // // Wait for the linking process to complete
    // await testPage.waitForTimeout(2000);
  
    // close link dialog
    await testPage.pause();
});

