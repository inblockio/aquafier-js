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
    await testPage.pause();
});


test("create a template", async (): Promise<void> => {
  test.setTimeout(process.env.CI ? 180000 : 50000); // 3 minutes in CI
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];
    console.log("create aqua form template started!");
  
    // Navigate to templates page
    await testPage.goto(`${process.env.BASE_URL}/app/templates`);
    // await testPage.reload()
    await testPage.waitForLoadState('networkidle');
    
  
    await testPage.waitForSelector('[data-testid="action-create-template-button"]', { state: 'visible', timeout: 10000 });
    await testPage.click('[data-testid="action-create-template-button"]');
    
    await testPage.fill('#title', 'Test Template');

    // Add two fields
    await testPage.click('[data-testid="action-add-form-field-button"]');
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
    
    // Fill the template form
    await testPage.fill(`[data-testid="field-label-0"]`, fields[0].label);
    await testPage.selectOption(`[data-testid="field-type-0"]`, fields[0].type);
    await testPage.click(`[data-testid="field-required-0"]`);
    
    await testPage.click('[data-testid="action-add-form-field-button"]');

    await testPage.waitForSelector('[data-testid="field-label-1"]', { state: 'visible', timeout: 10000 });
    await testPage.fill(`[data-testid="field-label-1"]`, fields[1].label);
    await testPage.selectOption(`[data-testid="field-type-1"]`, fields[1].type);
    await testPage.click(`[data-testid="field-required-1"]`);

    // Save the form
    await testPage.click('[data-testid="save-form-action-button"]');

    await testPage.pause();
});

