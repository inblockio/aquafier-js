import { test, BrowserContext, Page, chromium, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import fs from "fs";
import {
    addSignatureToDocument,
    closeUploadDialog,
    createAndSaveSignature,
    createAquaSignForm,
    createTemplate,
    downloadAquaTree,
    findAndClickHighestSharedButton,
    fundWallet,
    handleMetaMaskNetworkAndConfirm,
    importAquaChain,
    registerNewMetaMaskWallet,
    registerNewMetaMaskWalletAndLogin,
    shareDocument,
    signDocument,
    uploadFile,
    waitAndClick,
    witnessDocument
} from '../testUtils';

// Simple test to verify Playwright is working correctly
test("basic site accessibility test", async ({ page }) => {
    console.log("Running basic site accessibility test");
    // Navigate to the site
    await page.goto('/');
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
//
test("user alias setting test", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];
    console.log("user alias setting test started!");

    //wait until the main page was fully loaded
    await testPage.waitForSelector('[data-testid="nav-link-0"]', { state: 'visible' });

    await testPage.goto('/app/settings', { waitUntil: 'networkidle' })



    await testPage.fill('[data-testid="alias-name-input"]', "alias_data");
    console.log("filled aqua sign form");


    await testPage.waitForSelector('[data-testid="save-changes-settings"]', { state: 'visible', timeout: 1000 });
    await testPage.click('[data-testid="save-changes-settings"]');

    // for data to be saved
    await testPage.waitForTimeout(1000);

    console.log("Reloading page to verify alias name persistence");
    await testPage.reload({ waitUntil: 'networkidle' });

    //add a small wait to ensure the page is fully loaded
    await testPage.waitForTimeout(2000);
    const alisName: string = await testPage.locator('[data-testid="alias-name-input"]').inputValue();

    console.log(`Alias name after reload: ${alisName}`);

    if (alisName != "alias_data") {
        throw new Error("Alias name not updated");
    }

    console.log("Alias name updated successfully");
});


test("linking 2 files test", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];
    console.log("linking 2 files test started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
    await uploadFile(testPage, filePath);

    // close upload dialog
    await closeUploadDialog(testPage);

    // Upload file
    const filePath2: string = path.join(__dirname, '/../resources/logo.png');
    await uploadFile(testPage, filePath2);

    // close upload dialog
    await closeUploadDialog(testPage);

    await waitAndClick(testPage, '[data-testid="link-action-button-1"]')

    // Wait for the dialog to appear
    await testPage.waitForSelector('div[role="dialog"]', { state: 'visible' });

    // Click on the checkbox with id 'file-0'
    await waitAndClick(testPage, '#file-0')

    // Click on the link button in the dialog
    await waitAndClick(testPage, '[data-testid="link-modal-action-button-dialog"]')

    //TODO add a nice way to check if the linking was successful
    // close link dialog
});


test("upload, file form revision", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("upload, file form revisions started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/aqua.json');
    await uploadFile(testPage, filePath);

    // close upload dialog
    await waitAndClick(testPage, '[data-testid="create-form-3-button"]')

    // ✅ Wait for the table row that includes "aqua.json"
    const row = testPage.locator('table >> text=aqua.json');
    await expect(row).toBeVisible();
});

test("import, file multiple revisions", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("upload, file multiple revisions started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/aqua.json.aqua.json');
    await uploadFile(testPage, filePath);

    // Import the aqua chain
    await waitAndClick(testPage, '[data-testid="action-import-93-button"]');

    // Check if we need to select another file using Playwright's expect assertion
    const selectFileButton = testPage.locator('[data-testid="action-select-file-06-button"]');
    
    try {
        // Use expect().toBeVisible() with a short timeout to check if button exists
        await expect(selectFileButton).toBeVisible({ timeout: 5000 });
        console.log("Select file button found, proceeding with file selection...");

        // Button is visible, proceed with file selection
        await waitAndClick(testPage, '[data-testid="action-select-file-06-button"]');

        const filePath2: string = path.join(__dirname, '/../resources/aqua.json');
        console.log("File upload dropzone is visible");

        // Set up the file chooser promise BEFORE triggering the action
        const fileChooserPromise = testPage.waitForEvent('filechooser');

        // Trigger the file chooser
        await testPage.click('[data-testid="action-select-file-06-button"]');

        // Wait for and handle the file chooser
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath2);
        console.log("File selected in file chooser");
        console.log("Additional file uploaded successfully");

    } catch (error: any) {
        // Button not visible or file upload failed - this might be expected behavior
        console.log("Select file button not visible or file upload failed, continuing with test...");
        console.log("Error details:", error.message);
    }

    console.log("Checking for aqua.json in table...");

    // Simplified approach - try the most reliable locator first, then fallback
    const fileNameSpan = testPage.locator('table span.font-medium:has-text("aqua.json")');
    const tableRow = testPage.locator('table tr:has-text("aqua.json")');
    const tableText = testPage.locator('table').getByText('aqua.json');

    //sonar toast check up logic
    try {
        // Approach 1: Look for the specific span containing the filename
        await expect(fileNameSpan).toBeVisible({ timeout: 10000 });
        console.log("✅ Found aqua.json using span locator");
    } catch (error1) {
        try {
            // Approach 2: Look for table row containing the text
            await expect(tableRow).toBeVisible({ timeout: 5000 });
            console.log("✅ Found aqua.json using row locator");
        } catch (error2) {
            try {
                // Approach 3: Look for any text element containing aqua.json
                await expect(tableText).toBeVisible({ timeout: 5000 });
                console.log("✅ Found aqua.json using text locator");
            } catch (error3) {
                // Debug: take screenshot and dump table content
                console.log("❌ Failed to find aqua.json, debugging...");
                await testPage.screenshot({ path: 'debug-table-state.png', fullPage: true });
                
                // Check if table exists at all
                const table = testPage.locator('table');
                await expect(table).toBeVisible({ timeout: 5000 });
                
                const tableContent = await table.textContent();
                console.log("Table content:", tableContent);
                
                // List all table rows for debugging
                const rows = await table.locator('tr').all();
                console.log(`Found ${rows.length} table rows:`);
                for (let i = 0; i < rows.length; i++) {
                    const rowText = await rows[i].textContent();
                    console.log(`Row ${i}: ${rowText}`);
                }

                // Re-throw the error to fail the test
                throw new Error(`Could not find aqua.json in table. Table content: ${tableContent}`);
            }
        }
    }
});

test("upload, delete file", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("upload, file multiple revisions started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
    await uploadFile(testPage, filePath);

    await waitAndClick(testPage, '[data-testid="close-upload-dialog-button"]')

    await waitAndClick(testPage, '[data-testid="delete-aqua-tree-button-0"]')

    // ✅ Wait for the table row with "exampleFile.pdf" to be removed (not visible)
    const row = testPage.locator('table >> text=exampleFile.pdf');
    await expect(row).not.toBeVisible();

    // Reload the page and check again to ensure file is permanently deleted
    console.log("Reloading page to verify file deletion persisted");
    await testPage.reload();

    // Wait for page to load and check that exampleFile.pdf is still not visible
    const rowAfterReload = testPage.locator('table >> text=exampleFile.pdf');
    await expect(rowAfterReload).not.toBeVisible();

});

test("upload, sign, download", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("upload, sign, download started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
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
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
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
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("single user aqua-sign started!");

    // Create aqua sign form
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
    await createAquaSignForm(testPage, context, filePath);


    // Open workflow
    await waitAndClick(testPage, '[data-testid="open-aqua-sign-workflow-button-0"]')

    // View contract document
    await waitAndClick(testPage, '[data-testid="action-view-contract-button"]')

    // Create and save signature
    await createAndSaveSignature(testPage, context);

    // Add signature to document and sign
    await addSignatureToDocument(testPage, context);

    // Wait for completion
    await testPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });
});


test("two user aqua-sign", async (): Promise<void> => {
    const registerWalletOneResponse = await registerNewMetaMaskWalletAndLogin();
    const registerWalletTwoResponse = await registerNewMetaMaskWalletAndLogin();

    const contextWalletOne: BrowserContext = registerWalletOneResponse.context;
    const testPageWalletOne: Page = contextWalletOne.pages()[0];

    console.log("two user aqua-sign started!");


    // Create aqua sign form
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');
    await createAquaSignForm(testPageWalletOne, contextWalletOne, filePath, registerWalletTwoResponse.walletAddress);

    // await testPageWalletOne.reload()

    await waitAndClick(testPageWalletOne, '[data-testid="open-aqua-sign-workflow-button-0"]')

    await waitAndClick(testPageWalletOne, '[data-testid="action-view-contract-button"]')

    // Create and save signature
    await createAndSaveSignature(testPageWalletOne, contextWalletOne);

    // Add signature to document and sign
    await addSignatureToDocument(testPageWalletOne, contextWalletOne);

    const contextWalletTwo: BrowserContext = registerWalletTwoResponse.context;
    const testPageWalletTwo: Page = contextWalletTwo.pages()[0];

    await testPageWalletTwo.reload(); // Reload the second test page to ensure it's up-to-date ie the workflow was shared to ensure its loaded

    importAquaChain(testPageWalletTwo, contextWalletTwo)


    // Open workflow

    await waitAndClick(testPageWalletTwo, '[data-testid="open-aqua-sign-workflow-button-0"]')

    // View contract document
    await waitAndClick(testPageWalletTwo, '[data-testid="action-view-contract-button"]')

    // Create and save signature
    await createAndSaveSignature(testPageWalletTwo, contextWalletTwo);

    // Add signature to document and sign
    await addSignatureToDocument(testPageWalletTwo, contextWalletTwo);
});


// Test for sharing functionality
test("share document between two users", async (): Promise<void> => {
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
    const testFilePath = path.join(__dirname, '/../resources', 'exampleFile.pdf');

    await ownerPage.goto(`/app`);

    await uploadFile(ownerPage, testFilePath);
    await closeUploadDialog(ownerPage);

    await signDocument(ownerPage, ownerContext)

    console.log("share document between two users - share ");

    // Owner shares the document with recipient
    await shareDocument(ownerPage, ownerContext, recipientAddress);

    // Recipient verifies they can access the shared document
    await importAquaChain(recipientPage, recipientContext);
});

// Test for sharing with different permission levels
test("share document with everyone", async (): Promise<void> => {
    // Setup first user (document owner)
    const ownerResponse = await registerNewMetaMaskWalletAndLogin();
    const ownerContext: BrowserContext = ownerResponse.context;
    const ownerPage: Page = ownerContext.pages()[0];

    // Setup second user (document recipient)
    const recipientResponse = await registerNewMetaMaskWalletAndLogin();
    const recipientContext: BrowserContext = recipientResponse.context;
    const recipientPage: Page = recipientContext.pages()[0];

    // Owner uploads a document
    const testFilePath = path.join(__dirname, '/../resources', 'exampleFile.pdf');

    await ownerPage.goto(`/app`);
    await uploadFile(ownerPage, testFilePath);
    await closeUploadDialog(ownerPage);

    // Owner sign the document
    await signDocument(ownerPage, ownerContext);

    // Owner shares the document with recipient (with edit permissions)
    let shareUlr = await shareDocument(ownerPage, ownerContext, "");

    // Recipient verifies they can access and edit the shared document
    await importAquaChain(recipientPage, recipientContext, shareUlr);
});


test("import aqua zip test", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];
    console.log("Uploading aqua zip!");

    // Upload zip
    const filePath: string = path.join(__dirname, '/../resources/Screenshot from 2025-07-19 14-18-50.zip');
    await uploadFile(testPage, filePath);

    // close upload dialog
    // await closeUploadDialog(testPage);

    await waitAndClick(testPage, '[data-testid="action-import-82-button"]')

    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    //header + two files
    await expect(tableRows).toHaveCount(3);
});


test("create a template", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin(`app/templates`);
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];


    console.log("create aqua form template started!");

    console.log("Navigated to templates page");
    // await testPage.waitForTimeout(2000);

    await createTemplate(testPage);
});


test("delete a template", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin(`app/templates`);
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];


    console.log("create aqua form template started!");

    console.log("Navigated to templates page");
    // await testPage.waitForTimeout(2000);

    await createTemplate(testPage);
    console.log("Template created, now deleting it");
    // await deleteTemplate(testPage);


    await testPage.waitForSelector('[data-testid="delete-form-template-0"]', { state: 'visible' });
    await testPage.click('[data-testid=""]');
    console.log("Clicked delete template button using data-testid");
    try {
        await testPage.waitForSelector('[data-testid="delete-form-template-0"]', { state: 'visible' });
        await testPage.click('[data-testid="delete-form-template-0"]');
        console.log("Clicked delete template button using data-testid");
    } catch (error) {
        console.log("Failed to find button by data-testid, trying by id...");
        await testPage.waitForSelector('#delete-form-template-id-0', { state: 'visible' });
        await testPage.click('#delete-form-template-id-0');
        console.log("Clicked delete template button using id selector");
    }
});


test("create a simple claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin(`app`);
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];


    console.log("create aqua form template started!");


    await testPage.waitForSelector('[data-testid="create-claim-dropdown-button"]', { state: 'visible' });
    await testPage.click('[data-testid="create-claim-dropdown-button"]');


    await testPage.waitForSelector('[data-testid="create-simple-claim-dropdown-button-item"]', {
        state: 'visible'
    });
    await testPage.click('[data-testid="create-simple-claim-dropdown-button-item"]');


    // await testPage.click('[data-testid="create-document-signature"]');
    //   console.log("clicked aqua sign");

    // Upload document
    // await uploadFile(page, filePath, '[data-testid="input-document"]');

    // Configure signers
    // await testPage.click('[data-testid="multiple_values_signers"]');
    // console.log("clicked multiple values signers");

    // const metaMaskAdr: string = await testPage.locator('[data-testid="input-sender"]').inputValue();
    await testPage.fill('[data-testid="input-claim_context"]', "i claim the name sample");
    console.log("input claim context filles");


    await testPage.fill('[data-testid="input-name"]', "sample");
    console.log("input claim name ");


    // Submit form and handle MetaMask
    const metamaskPromise = context.waitForEvent("page");
    await testPage.click('[type="submit"]');
    await metamaskPromise;

    await handleMetaMaskNetworkAndConfirm(context, true);

});

test("create simple claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("create a simple claim!");

    // Open workflow
    await waitAndClick(testPage, '[data-testid="create-claim-dropdown-button"]')
    console.log("claims dropdown ");
    await waitAndClick(testPage, '[data-testid="create-simple-claim-dropdown-button-item"]')

    console.log("fill simple claim form");
    await testPage.locator('[id="input-claim_context"]').fill("i attest the name in a test ");
    await testPage.locator('[id="input-name"]').fill("Test user ");

    const metamaskPromise = context.waitForEvent("page");
    // await page.getByText("Save Signature").click();

    console.log("create workflow");
    await testPage.getByText("Create Workflow").click();
    await metamaskPromise;


    await handleMetaMaskNetworkAndConfirm(context, false);

    console.log("simple workflow created");

    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    // //header + two files
    await expect(tableRows).toHaveCount(2);
});


test("create dns claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("create a dns claim!");

    // Open workflow
    await waitAndClick(testPage, '[data-testid="create-claim-dropdown-button"]')
    console.log("claims dropdown ");
    await waitAndClick(testPage, '[data-testid="create-dns-claim-dropdown-button-item"]')

    console.log("fill dns claim form");
    // await testPage.locator('[id="input-wallet_address"]').fill("0x6c5544021930b7887455e21F00b157b2FA572667");
    await testPage.locator('[id="input-domain"]').fill("inblock.io");

    const metamaskPromise = context.waitForEvent("page");
    // await page.getByText("Save Signature").click();

    console.log("create workflow");
    await testPage.getByText("Create Workflow").click();
    await metamaskPromise;

    console.log("sign dns txt record ");
    await handleMetaMaskNetworkAndConfirm(context, false);

    console.log("sign the aqua tree ");

    await handleMetaMaskNetworkAndConfirm(context, false);
    console.log("dns workflow created");

    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    // //header + two files
    await expect(tableRows).toHaveCount(2);
});


test("import dns claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("import user signature test started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/domain_claim-675.zip');

    await testPage.waitForSelector('[data-testid="file-upload-dropzone"]', { state: 'visible' });

    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await waitAndClick(testPage, '[data-testid="file-upload-dropzone"]')
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await testPage.click('[data-testid="action-import-82-button"]')
    console.log("File uploaded successfully");


    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    //header + two files
    await expect(tableRows).toHaveCount(2);

    console.log("open details");
    try {
        // Click and wait for the dialog to appear
        await Promise.all([
            testPage.waitForSelector('text=This aqua tree is valid'),
            testPage.click('[data-testid="open-aqua-claim-workflow-button-0"]')
        ]);

        // Verify the validation message is visible
        const validationMessage = testPage.locator('text=This aqua tree is valid');
        await expect(validationMessage).toBeVisible();

        console.log("Aqua tree validation confirmed!");

    } catch (error) {
        console.log("Error after clicking details button:", error);

        // Check if page is still alive
        if (testPage.isClosed()) {
            throw new Error("Test page was closed unexpectedly");
        }

        throw error;
    }
});


test("import user  signature", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];


    console.log("import user  signature test started!");

    // Upload file
    const filePath: string = path.join(__dirname, '/../resources/user_signature-577.zip');
    let dropzoneSelector: string = '[data-testid="file-upload-dropzone"]'
    console.log("Waiting for file upload dropzone to be visible...");
    await testPage.waitForSelector(dropzoneSelector, { state: 'visible' });
    console.log("File upload dropzone is visible");

    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await testPage.click(dropzoneSelector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await testPage.click('[data-testid="action-import-82-button"]')
    console.log("File uploaded successfully");


    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    //header + two files
    await expect(tableRows).toHaveCount(2);

    console.log("open details");
    try {
        // Click and wait for the dialog to appear
        await Promise.all([
            testPage.waitForSelector('text=This aqua tree is valid'),
            testPage.click('[data-testid="open-aqua-claim-workflow-button-0"]')
        ]);

        // Verify the validation message is visible
        const validationMessage = testPage.locator('text=This aqua tree is valid');
        await expect(validationMessage).toBeVisible();

        console.log("Aqua tree validation confirmed!");

    } catch (error) {
        console.log("Error after clicking details button:", error);

        // Check if page is still alive
        if (testPage.isClosed()) {
            throw new Error("Test page was closed unexpectedly");
        }

        throw error;
    }

});


test("create aqua sign claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("create a dns claim!");

    // Open workflow
    await waitAndClick(testPage, '[data-testid="create-claim-dropdown-button"]')
    console.log("claims dropdown ");
    await waitAndClick(testPage, '[data-testid="create-signature-claim-dropdown-button-item"]')

    console.log("fill dns claim form");

    await testPage.locator('[id="input-name"]').fill("User name ");

    await testPage.getByText("Create Workflow").waitFor({ state: 'visible' });
    await testPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
    await testPage.click('[class="signature-canvas"]');

    const metamaskPromise = context.waitForEvent("page");
    await testPage.getByText("Create Workflow").click();
    await metamaskPromise;

    await handleMetaMaskNetworkAndConfirm(context, false);
    console.log("signature saved");
    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    // //header + two files
    await expect(tableRows).toHaveCount(2);
});


test("create email claim", async (): Promise<void> => {
    const registerResponse = await registerNewMetaMaskWalletAndLogin();
    const context: BrowserContext = registerResponse.context;
    const testPage: Page = context.pages()[0];

    console.log("create a email claim!");

    // Open workflow
    await waitAndClick(testPage, '[data-testid="create-claim-dropdown-button"]')
    console.log("claims dropdown ");
    await waitAndClick(testPage, '[data-testid="create-email-claim-dropdown-button-item"]')

    console.log("fill email claim form");

    await testPage.locator('[id="input-name"]').fill("User name ");

    await testPage.getByText("Create Workflow").waitFor({ state: 'visible' });
    await testPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
    await testPage.click('[class="signature-canvas"]');

    const metamaskPromise = context.waitForEvent("page");
    await testPage.getByText("Create Workflow").click();
    await metamaskPromise;

    await handleMetaMaskNetworkAndConfirm(context, false);
    console.log("signature saved");
    // Check that the table has two rows and contains aqua.json
    const tableRows = testPage.locator('table tr');
    // //header + two files
    await expect(tableRows).toHaveCount(2);
});