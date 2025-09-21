import {BrowserContext, Page, test} from '@playwright/test';
import path from "path";
import {
    addSignatureToDocument,
    createAndSaveSignature,
    createAquaSignForm,
    importAquaChain,
    registerNewMetaMaskWalletAndLogin,
    waitAndClick,
} from '../testUtils';

test("two user aqua-sign", async (): Promise<void> => {
    test.slow();
    const registerWalletOneResponse = await registerNewMetaMaskWalletAndLogin();

    const contextWalletOne: BrowserContext = registerWalletOneResponse.context;
    const testPageWalletOne: Page = contextWalletOne.pages()[0];

    console.log("two user aqua-sign started!");


    // Create aqua sign form
    const filePath: string = path.join(__dirname, '/../resources/exampleFile.pdf');

    console.log("timout to mimick delay between two users, avoid throttling");
    await testPageWalletOne.waitForTimeout(2000);
    const registerWalletTwoResponse = await registerNewMetaMaskWalletAndLogin();
    await testPageWalletOne.waitForTimeout(1000);

    console.log("Create aqua sign form ..");
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