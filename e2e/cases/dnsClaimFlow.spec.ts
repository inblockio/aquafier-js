import { BrowserContext, expect, Page, test } from '@playwright/test';
import {
    downloadAquaTree,
    handleMetaMaskNetworkAndConfirm,
    registerNewMetaMaskWalletAndLogin,
    waitAndClick
} from '../testUtils';

test("create and import dns claim", async (): Promise<void> => {
    // 1. Log in with creator context
    const creatorResponse = await registerNewMetaMaskWalletAndLogin();
    const creatorContext: BrowserContext = creatorResponse.context;
    const creatorPage: Page = creatorContext.pages()[0];

    console.log("create a dns claim!");

    // 2. Fill out DNS claim form
    await waitAndClick(creatorPage, '[data-testid="create-claim-dropdown-button"]');
    console.log("claims dropdown opened");

    await waitAndClick(creatorPage, '[data-testid="create-dns-claim-dropdown-button-item"]');
    console.log("fill dns claim form");

    await creatorPage.locator('[id="input-domain"]').fill("inblock.io");

    // 3. Submit form to create claim and handle MetaMask signatures
    const metamaskPromise = creatorContext.waitForEvent("page");
    console.log("create workflow");
    await creatorPage.getByText("Create Workflow").click();
    await metamaskPromise;

    console.log("sign dns txt record");
    await handleMetaMaskNetworkAndConfirm(creatorContext, false);

    console.log("sign the aqua tree");
    await handleMetaMaskNetworkAndConfirm(creatorContext, false);
    console.log("dns workflow created");

    // 4. Download the created DNS claim
    const downloadedFilePath: string = await downloadAquaTree(creatorPage, false);
    console.log("DNS claim downloaded");

    // 5. Log in with importer context
    const importerResponse = await registerNewMetaMaskWalletAndLogin();
    const importerContext: BrowserContext = importerResponse.context;
    const importerPage: Page = importerContext.pages()[0];

    console.log("import dns claim test started!");

    // 6. Import the DNS claim using the file we just created and downloaded
    await importerPage.waitForSelector('[data-testid="file-upload-dropzone"]', { state: 'visible' });

    const fileChooserPromise = importerPage.waitForEvent('filechooser');
    await waitAndClick(importerPage, '[data-testid="file-upload-dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadedFilePath);

    await importerPage.click('[data-testid="action-import-82-button"]');
    console.log("File uploaded successfully");

    // 7. Open claim details
    console.log("open details");
    try {
        await importerPage.locator('[data-testid="open-aqua-claim-workflow-button-0"]').first().click();
        console.log("Clicked details button, waiting for validation message...");

        // Take a screenshot for debugging in CI
        if (process.env.CI) {
            await importerPage.screenshot({ path: 'debug-before-validation.png' });
        }

        // 8. Verify the claim is valid
        const timeout = process.env.CI ? 15000 : 10000;
        await importerPage.waitForSelector('text=This aqua tree is valid', {
            state: 'visible',
            timeout: timeout
        });

        const validationMessage = importerPage.locator('text=This aqua tree is valid').first();
        await expect(validationMessage).toBeVisible({ timeout: timeout });

        console.log("Aqua tree validation confirmed!");

    } catch (error) {
        console.log("Error after clicking details button:", error);
        console.log("Page URL:", importerPage.url());

        // Take screenshot on failure for debugging
        if (process.env.CI) {
            await importerPage.screenshot({ path: 'debug-on-failure.png' });
        }

        // Check if page is still alive
        if (importerPage.isClosed()) {
            throw new Error("Test page was closed unexpectedly");
        }

        // Log additional debugging information
        try {
            const pageContent = await importerPage.content();
            console.log("Page content length:", pageContent.length);

            const buttonExists = await importerPage.locator('[data-testid="open-aqua-claim-workflow-button-0"]').first().isVisible();
            console.log("Details button still visible:", buttonExists);

            const errorElements = await importerPage.locator('[class*="error"], [data-testid*="error"]').count();
            console.log("Error elements found:", errorElements);

        } catch (debugError) {
            console.log("Failed to gather debug info:", debugError);
        }

        throw error;
    }
});
