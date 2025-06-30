import path from "path";
import {BrowserContext, chromium} from "playwright";

export function generatePassword(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// NEW FUNCTION ADDED - Helper function to switch to a test network
async function switchToTestNetwork(metaMaskPage: any) {
    try {
        // Click on network dropdown
        await metaMaskPage.click('[data-testid="network-display"]');
        
        // Wait for network list
        await metaMaskPage.waitForSelector('[data-testid="network-list"]', {state: 'visible', timeout: 5000});
        
        // Try to select Sepolia testnet or localhost
        const networkOptions = [
            '[data-testid="Sepolia-list-item"]',
            '[data-testid="Localhost 8545-list-item"]',
            'button:has-text("Sepolia")',
            'button:has-text("Localhost")'
        ];
        
        for (const networkSelector of networkOptions) {
            try {
                await metaMaskPage.waitForSelector(networkSelector, {state: 'visible', timeout: 2000});
                await metaMaskPage.click(networkSelector);
                console.log(`Switched to test network: ${networkSelector}`);
                return;
            } catch {
                continue;
            }
        }
        
        // If no test networks found, close the dropdown
        await metaMaskPage.press('[data-testid="network-list"]', 'Escape');
        
    } catch (error) {
        console.log("Could not switch network:", error.message);
    }
}


export async function registerNewMetaMaskWallet(): Promise<RegisterMetaMaskResponse>{
    const metamaskPath = path.join(__dirname, 'metamask-extension');

    const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${metamaskPath}`,
            `--load-extension=${metamaskPath}`,
        ],
    });

    await context.waitForEvent("page")

    const metaMaskPage = await context.pages()[1];

    await metaMaskPage.waitForLoadState("load");

    //setup-page
    await metaMaskPage.click('[data-testid="onboarding-terms-checkbox"]')
    await metaMaskPage.click('[data-testid="onboarding-create-wallet"]')

    //tele-data deny
    await metaMaskPage.waitForSelector('[data-testid="metametrics-no-thanks"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="metametrics-no-thanks"]')

    //password setup
    let myNewPassword = generatePassword(15)
    await metaMaskPage.waitForSelector('[data-testid="create-password-new"]', {state: 'visible'})
    await metaMaskPage.fill('[data-testid="create-password-new"]', myNewPassword)
    await metaMaskPage.fill('[data-testid="create-password-confirm"]', myNewPassword)
    await metaMaskPage.click('[data-testid="create-password-terms"]')
    await metaMaskPage.click('[data-testid="create-password-wallet"]')

    //no i dont want to store my wallet
    await metaMaskPage.waitForSelector('[data-testid="secure-wallet-later"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="secure-wallet-later"]')
    await metaMaskPage.waitForSelector('[data-testid="skip-srp-backup-popover-checkbox"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="skip-srp-backup-popover-checkbox"]')
    await metaMaskPage.click('[data-testid="skip-srp-backup"]')

    //done
    await metaMaskPage.waitForSelector('[data-testid="onboarding-complete-done"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="onboarding-complete-done"]')

    //finish tutorial
    await metaMaskPage.waitForSelector('[data-testid="pin-extension-next"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="pin-extension-next"]')
    await metaMaskPage.waitForSelector('[data-testid="pin-extension-done"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="pin-extension-done"]')

    await metaMaskPage.waitForSelector('[data-testid="network-display"]', {state: 'visible'});

    // CHANGE ADDED - Add network switching to localhost/testnet BEFORE proceeding
    // try {
    //     await switchToTestNetwork(metaMaskPage);
    // } catch (error) {
    //     console.log("Could not switch network, continuing with current network");
    // }
    

    await metaMaskPage.waitForSelector('[data-testid="not-now-button"]', {state: 'visible', timeout: 100000});
    await metaMaskPage.click('[data-testid="not-now-button"]')

    await metaMaskPage.waitForSelector('[data-testid="account-menu-icon"]')
    await metaMaskPage.click('[data-testid="account-menu-icon"]')
    await metaMaskPage.waitForSelector('[data-testid="account-list-item-menu-button"]')
    await metaMaskPage.click('[data-testid="account-list-item-menu-button"]')
    await metaMaskPage.waitForSelector('[data-testid="account-list-menu-details"]')
    await metaMaskPage.click('[data-testid="account-list-menu-details"]')
    await metaMaskPage.getByText("Details").waitFor({state: 'visible'})
    await metaMaskPage.getByText("Details").click()
    await metaMaskPage.waitForSelector('[class="mm-box mm-text qr-code__address-segments mm-text--body-md mm-box--margin-bottom-4 mm-box--color-text-default"]')
    const address = await metaMaskPage.locator('[class="mm-box mm-text qr-code__address-segments mm-text--body-md mm-box--margin-bottom-4 mm-box--color-text-default"]').textContent()

    await metaMaskPage.close()

    console.log("Wallet finished!!! Adr: " + address)

    return new RegisterMetaMaskResponse(context, address);
}

export async function registerNewMetaMaskWalletAndLogin(): Promise<RegisterMetaMaskResponse>{
    const response = await registerNewMetaMaskWallet();
    const context = response.context;
    const testPage = context.pages()[0];
    await testPage.waitForLoadState("load")
    
    // Get the BASE_URL from environment variables and navigate to it
    const baseUrl = process.env.BASE_URL || "http://localhost:5173/";
    console.log(`Navigating to: ${baseUrl}`);
    await testPage.goto(baseUrl, { waitUntil: 'networkidle' })
    
    console.log("Page loaded, looking for sign-in button...");
    
    try {
        // Take a screenshot to help debug
        // await testPage.screenshot({ path: 'page-before-login.png' });
        // console.log("Screenshot saved as page-before-login.png");
        
        // Look for any sign-in button with a more flexible approach
        console.log("Looking for any sign-in button...");
        
             // Wait for and click the sign-in button
            //  await testPage.waitForSelector('[data-testid="sign-in-button-dialog"]', {state: 'visible', timeout: 60000})
            //  console.log("Sign-in button found, clicking it...");
        // Try different possible selectors for the sign-in button
        const signInButtonSelectors = [
            '[data-testid="sign-in-button-dialog"]',
            '[data-testid="sign-in-button-navbar"]',
            '[data-testid="sign-in-button"]',
            'button:has-text("Sign In")',
            'button:has-text("Connect")',
            'button:has-text("Login")'
        ];
        
        let buttonFound = false;
        const metamaskPromise = context.waitForEvent("page");
        
         // Click the sign-in button using the data-testid attribute
        //  await testPage.click('[data-testid="sign-in-button-dialog"]');
        // Try each selector until we find a visible button
        for (const selector of signInButtonSelectors) {
            try {
                const isVisible = await testPage.isVisible(selector, { timeout: 5000 });
                if (isVisible) {
                    console.log(`Found visible sign-in button with selector: ${selector}`);
                    await testPage.click(selector);
                    buttonFound = true;
                    break;
                }
            } catch (e) {
                console.log(`Selector ${selector} not found or not visible`);
            }
        }
        
        if (!buttonFound) {
            // If no button found with specific selectors, try to find any button that might be a sign-in button
            console.log("No specific sign-in button found, looking for any button that might be for sign-in...");
            
            // Take a screenshot to see what's on the page
            await testPage.screenshot({ path: 'page-no-button-found.png' });
            
            // Force click the first button we find as a last resort
            await testPage.click('button', { force: true });
            console.log("Clicked first button found as fallback");
        }
        console.log("Clicked sign-in button, waiting for MetaMask popup...");
        
        await metamaskPromise;
        console.log("MetaMask popup opened");
    } catch (error) {
        console.error("Error during login:", error);
        await testPage.screenshot({ path: 'login-error.png' });
        throw error;
    }

    const metamaskPage = context.pages()[1]
    await metamaskPage.waitForSelector('[data-testid="confirm-btn"]', {state: 'visible'})
    await metamaskPage.click('[data-testid="confirm-btn"]')

    await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible'})
    await metamaskPage.click('[data-testid="confirm-footer-button"]')

    return response;
}

class RegisterMetaMaskResponse{


    constructor(context: BrowserContext, walletAddress: string) {
        this.context = context;
        this.walletAddress = walletAddress;
    }

    context: BrowserContext;
    walletAddress: string;
}