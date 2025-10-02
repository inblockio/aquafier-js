import { BrowserContext, expect, Page, test } from '@playwright/test';
import {
    handleMetaMaskNetworkAndConfirm,
    importAquaChain,
    registerNewMetaMaskWalletAndLogin,
    shareDocument,
    waitAndClick
  } from '../testUtils';
test("create a simple claim", async (): Promise<void> => {
    // 1. Log in with sharer context
    const registerResponse = await registerNewMetaMaskWalletAndLogin(`app`);
    const sharerContext: BrowserContext = registerResponse.context;
    const sharerPage: Page = sharerContext.pages()[0];

    // 2. Fill out form
    console.log("create aqua form template started!");
    await sharerPage.waitForSelector('[data-testid="create-claim-dropdown-button"]', { state: 'visible' });
    await sharerPage.click('[data-testid="create-claim-dropdown-button"]');

    await sharerPage.waitForSelector('[data-testid="create-simple-claim-dropdown-button-item"]', {
        state: 'visible'
    });
    await sharerPage.click('[data-testid="create-simple-claim-dropdown-button-item"]');

    // const metaMaskAdr: string = await sharerPage.locator('[data-testid="input-sender"]').inputValue();
    await sharerPage.fill('[data-testid="input-claim_context"]', "i claim the name sample");
    console.log("input claim context files");

    await sharerPage.fill('[data-testid="input-name"]', "sample");
    console.log("input claim name ");

    // 3. Submit form to create claim and handle MetaMask
    const metamaskPromise = sharerContext.waitForEvent("page");
    await sharerPage.click('[type="submit"]');
    await metamaskPromise;
    await handleMetaMaskNetworkAndConfirm(sharerContext, true);

    // 4. Log in with attestor context
    const attestorResponse = await registerNewMetaMaskWalletAndLogin();
    const attestorContext: BrowserContext = attestorResponse.context;
    const attestorPage: Page = attestorContext.pages()[0];

    // 5. Share the claim
    let shareUrl = await shareDocument(sharerPage, sharerContext, "");

    // 6. Import the claim (do we now have multiple paths? should we test all of them?)
    // Recipient verifies they can access and edit the shared document
    await importAquaChain(attestorPage, attestorContext, shareUrl);

    await expect(attestorPage.getByText("identity_attestation-")).toHaveCount(0);
    // 7. Attest the claim
    await attestorPage.waitForTimeout(1000);
    await waitAndClick(attestorPage, '[data-testid="attest-aqua-claim-button-0"]')

    await attestorPage.locator('[id="input-context"]').fill("yes i attest this claim");
    await attestorPage.getByText("Create Workflow").click();
    const metamaskPromise2 = attestorContext.waitForEvent("page");
    await metamaskPromise2;

    await handleMetaMaskNetworkAndConfirm(attestorContext, false);

    // 8. Verify that it got attested (two ways)
    // use current attestor context
    await expect(attestorPage.getByText("identity_attestation-")).toHaveCount(1);
    await sharerPage.waitForTimeout(1000);
    await expect(sharerPage.getByText("identity_attestation-")).toHaveCount(1);
});
