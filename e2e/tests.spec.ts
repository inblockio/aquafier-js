import { test } from '@playwright/test';
import dotenv from 'dotenv';
import path from "path";
import * as fs from 'fs/promises';
import { findAndClickHighestSharedButton, registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin } from './testUtils';
import { cp } from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });


//prepare metamask
test.beforeAll(async () => {
  let url = process.env.BASE_URL || "https://dev.inblock.io";
  console.log(`Base URL: ${url}`);
})

test("create new wallet test", async () => {
  await registerNewMetaMaskWallet();
})


test("login test", async () => {
  await registerNewMetaMaskWalletAndLogin()
})


test("upload, sign, download", async () => {
  test.setTimeout(80000) // Increase timeout to 60 seconds
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context = registerResponse.context;

  const testPage = context.pages()[0];

  console.log("upload, sign, download started!")

  //upload
  console.log("Waiting for file upload dropzone to be visible...")

  // Wait for the dropzone using the correct data-testid
  await testPage.waitForSelector('[data-testid="file-upload-dropzone"]', { state: 'visible', timeout: 10000 })
  console.log("File upload dropzone is visible")


  // First wait for the file upload button to be visible and clickable
  await testPage.waitForSelector('[data-testid="file-upload-dropzone"]', { state: 'visible', timeout: 10000 });

  // Create the file chooser promise before clicking the button
  const fileChooserPromise = testPage.waitForEvent('filechooser');

  // Click the upload button using the correct data-testid
  await testPage.click('[data-testid="file-upload-dropzone"]');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'resources/exampleFile.pdf'));

  console.log("File dropped on file-upload-dropzone");

  // Wait a moment for the file to be processed
  await testPage.waitForTimeout(2000);

  console.log("Waiting for clear completed button to appear...")
  await testPage.waitForSelector('[data-testid="clear-completed-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="clear-completed-button"]');


  console.log("Waiting for close upload dialog to appear ")
  await testPage.waitForSelector('[data-testid="close-upload-dialog-button"]', { state: 'visible', timeout: 10000 });
  await testPage.click('[data-testid="close-upload-dialog-button"]');

  console.log("Clicked close upload dialog button")


  //sign
  console.log("Waiting for sign button to appear...")

  // Wait for the table to load and show the file
  // await testPage.waitForSelector('table', { state: 'visible', timeout: 10000 })
  // console.log("Table is visible")


  // Wait for the sign button using its data-testid
  await testPage.waitForSelector('[data-testid="sign-action-button"]', { state: 'visible', timeout: 10000 })
  console.log("Sign button is visible")

  let metaMaskPromise = context.waitForEvent("page");
  await testPage.click('[data-testid="sign-action-button"]')
  console.log("Clicked sign button, waiting for MetaMask popup...")

  //wait for metamask
  await metaMaskPromise;


  //switch network
  let metaMaskPage = context.pages()[1];
  await metaMaskPage.getByText("Sepolia").waitFor({ state: 'visible' })
  await metaMaskPage.waitForSelector('[data-testid="page-container-footer-next"]', { state: 'visible' });
  await metaMaskPage.click('[data-testid="page-container-footer-next"]')

  await metaMaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible' })
  await metaMaskPage.click('[data-testid="confirm-footer-button"]')

  //download
  // await testPage.getByText("Download").waitFor({state: 'visible'})
  // await testPage.getByText("Download").click()
  await testPage.waitForSelector('[data-testid="download-aqua-tree-button"]', { state: 'visible' })
  await testPage.click('[data-testid="download-aqua-tree-button"]')

  console.log("upload, sign, download finished!")
})

test("single user aqua-sign", async () => {
  test.setTimeout(80000) // Increase timeout to 80 seconds
  const registerResponse = await registerNewMetaMaskWalletAndLogin();
  const context = registerResponse.context;

  const testPage = context.pages()[0];

  console.log("single user aqua-sign started!")


  // click navbar button
  // await testPage.waitForSelector('[data-testid="action-form-63-button"]', { state: 'visible' });
  // await testPage.click('[data-testid="action-form-63-button"]')

  // console.log("clicked navbar button")
  // click create form from template dropwdown element
  // await testPage.click('[data-testid="create-form-from-template"]')
  // console.log("clicked create form from template")


  await testPage.click('[data-testid="create-document-signature"]')



  console.log("clicked aqua sign")

  // await testPage.waitForSelector('[data-testid="input-document"]', { state: 'visible' });
  const fileChooserPromise = testPage.waitForEvent('filechooser');
  await testPage.click('[data-testid="input-document"]')
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, 'resources/exampleFile.pdf'));


  await testPage.click('[data-testid="multiple_values_signers"]')
  console.log("clicked multiple values signers")

  const metaMaskAdr = await testPage.locator('[data-testid="input-sender"]').inputValue();
  await testPage.fill('[data-testid="input-signers-0"]', metaMaskAdr);
  console.log("filled aqua sign form")



  let metamaskPromise = context.waitForEvent("page")
  await testPage.click('[type="submit"]');
  await metamaskPromise;

  let metamaskPage = context.pages()[1]
  await metamaskPage.waitForSelector('[data-testid="page-container-footer-next"]', { state: 'visible' });

  //switch network and sign
  await metamaskPage.click('[data-testid="page-container-footer-next"]');
  await metamaskPage.click('[data-testid="confirm-footer-button"]');

  await testPage.getByText("Open Workflow").waitFor({ state: 'visible' });
  await testPage.getByText("Open Workflow").click();

  await testPage.getByText("View Contract Document").waitFor({ state: 'visible' });
  await testPage.getByText("View Contract Document").click();

  await testPage.getByText("Create Signature").waitFor({ state: 'visible' });
  await testPage.getByText("Create Signature").click();

  console.log("created signature")

  await testPage.getByText("Save Signature").waitFor({ state: 'visible' });
  await testPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
  await testPage.click('[class="signature-canvas"]');

  metamaskPromise = context.waitForEvent("page")
  await testPage.getByText("Save Signature").click();
  await metamaskPromise;

  metamaskPage = context.pages()[1]

  console.log("signature saved")

  await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible' });
  await metamaskPage.click('[data-testid="confirm-footer-button"]')

  await metamaskPage.waitForEvent("close");
  await testPage.getByText("Add Signature to document").waitFor({ state: 'visible' });
  await testPage.getByText("Add Signature to document").click();
  console.log("Add Signature to document")

  // await testPage.click('[class="css-1exhycx"]')
  await testPage.waitForSelector('[data-testid="pdf-canvas"]', { state: 'visible' })
  await testPage.click('[data-testid="pdf-canvas"]')

  console.log(" Signature added to document")

  metamaskPromise = context.waitForEvent("page")
  await testPage.getByText("Sign document").click();

  console.log(" Sign document button clicked ")
  await metamaskPromise;

  metamaskPage = context.pages()[1]

  await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
  await metamaskPage.click('[data-testid="confirm-footer-button"]')

  await testPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });
})


//todo fix me
// test("two user aqua-sign", async () => {

//   test.setTimeout(900000 * 1000)
//   const secondWalletResponsePromise = registerNewMetaMaskWalletAndLogin();

//   const registerResponsePromise = registerNewMetaMaskWalletAndLogin();

//   const secondWalletResponse = await secondWalletResponsePromise;
//   const registerResponse = await registerResponsePromise;

//   let context = registerResponse.context;

//   const testPage = context.pages()[0];

//   console.log("two user aqua-sign started!")


//   // click navbar button
//   // await testPage.waitForSelector('[data-testid="action-form-63-button"]', { state: 'visible' });
//   // await testPage.click('[data-testid="action-form-63-button"]')

//   // console.log("clicked navbar button")
//   // // click create form from template dropwdown element
//   // await testPage.click('[data-testid="create-form-from-template"]')
//   // console.log("clicked create form from template")
//   // await testPage.click('[data-testid="aqua_sign"]')

//   await testPage.click('[data-testid="create-document-signature"]')
//   console.log("clicked aqua sign")
  
  
//   //
//   await testPage.waitForSelector('[data-testid="input-document"]', { state: 'visible' });
//   const fileChooserPromise = testPage.waitForEvent('filechooser');
//   await testPage.click('[data-testid="input-document"]')
//   const fileChooser = await fileChooserPromise;
//   await fileChooser.setFiles(path.join(__dirname, 'resources/exampleFile.pdf'));

//   await testPage.click('[data-testid="multiple_values_signers"]')
//   const metaMaskAdr = await testPage.locator('[data-testid="input-sender"]').inputValue();

//   console.log("Owner MetaMask address: " + metaMaskAdr);
//   console.log("Second signer MetaMask address: " + secondWalletResponse.walletAddress);
//   console.log("Filling aqua sign form with two signers")
//   // Fill the signers input fields with the MetaMask address and the second wallet address
//   await testPage.fill('[data-testid="input-signers-0"]', metaMaskAdr);
//   await testPage.fill('[data-testid="input-signers-1"]', secondWalletResponse.walletAddress);
//   console.log("filled aqua sign form")


//   let metamaskPromise = context.waitForEvent("page")
//   await testPage.click('[type="submit"]');
//   await metamaskPromise;
//   console.log("MetaMask popup context created, waiting for popup...")

//   let metamaskPage = context.pages()[1]
//   await metamaskPage.waitForSelector('[data-testid="page-container-footer-next"]', { state: 'visible' });
//   console.log("MetaMask popup appeared, switching network and signing...")

//   //switch network and sign
//   try {
//     // Add a small delay to ensure the popup is fully loaded
//     await metamaskPage.waitForTimeout(1000);

//     // Click the next button and wait for the UI to update
//     await metamaskPage.click('[data-testid="page-container-footer-next"]');
//     //   await metamaskPage.waitForTimeout(1000);

//     // Wait for the confirm button to be visible before clicking
//     await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//     await metamaskPage.click('[data-testid="confirm-footer-button"]');

//     // Wait for the popup to process the action
//     //   await metamaskPage.waitForTimeout(2000);
//   } catch (error) {
//     console.log('Error during MetaMask confirmation:', error);
//     // Take a screenshot to help debug
//     try {
//       await metamaskPage.screenshot({ path: 'metamask-error.png' });
//       console.log('Screenshot saved as metamask-error.png');
//     } catch (screenshotError) {
//       console.log('Could not take screenshot:', screenshotError);
//     }
//     throw error;
//   }


//   // await testPage.getByText("Open Workflow").waitFor({ state: 'visible' });
//   await testPage.waitForSelector('[data-testid="open-workflow-button"]', { state: 'visible' });
//   // await testPage.getByText("Open Workflow").click();
//   await testPage.click('[data-testid="open-workflow-button"]')


//   //  await testPage.getByText("View Contract Document").waitFor({ state: 'visible' });
//   await testPage.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible' });
//   //  await testPage.getByText("View Contract Document").click();
//   await testPage.click('[data-testid="action-view-contract-button"]')

//   //  await testPage.getByText("Create Signature").waitFor({ state: 'visible' });
//   await testPage.waitForSelector('[data-testid="action-create-signature-button"]', { state: 'visible' });
//   //  await testPage.getByText("Create Signature").click();
//   await testPage.click('[data-testid="action-create-signature-button"]')

//   //  await testPage.getByText("Save Signature").waitFor({ state: 'visible' });
//   await testPage.waitForSelector('[data-testid="action-loading-save-signature-button"]', { state: 'visible' });
//   await testPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
//   await testPage.click('[class="signature-canvas"]');

//   metamaskPromise = context.waitForEvent("page")
//   //  await testPage.getByText("Save Signature").click();
//   await testPage.click('[data-testid="action-loading-save-signature-button"]')
//   await metamaskPromise;

//   metamaskPage = context.pages()[1]

//   // await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible' });
//   // await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   try {
//     // Add a small delay to ensure the popup is fully loaded
//     await metamaskPage.waitForTimeout(1000);

//     // Wait for the confirm button to be visible before clicking
//     await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//     await metamaskPage.click('[data-testid="confirm-footer-button"]');

//     // Wait for the popup to process the action
//     // await metamaskPage.waitForTimeout(2000);
//   } catch (error) {
//     console.log('Error during MetaMask confirmation (second interaction):', error);
//     // Take a screenshot to help debug
//     try {
//       await metamaskPage.screenshot({ path: 'metamask-error-2.png' });
//       console.log('Screenshot saved as metamask-error-2.png');
//     } catch (screenshotError) {
//       console.log('Could not take screenshot:', screenshotError);
//     }
//     throw error;
//   }

//   await metamaskPage.waitForEvent("close");
//   // await testPage.getByText("Add Signature to document").waitFor({ state: 'visible' });
//   await testPage.waitForSelector('[data-testid="action-signature-to-document-button"]', { state: 'visible' });
//   // await testPage.getByText("Add Signature to document").click();
//   await testPage.click('[data-testid="action-signature-to-document-button"]')

//   await testPage.click('[class="css-1exhycx"]')


//   metamaskPromise = context.waitForEvent("page")
//   await testPage.getByText("Sign document").click();
//   await metamaskPromise;

//   metamaskPage = context.pages()[1]

//   // await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//   // await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   try {
//     // Add a small delay to ensure the popup is fully loaded
//     await metamaskPage.waitForTimeout(1000);

//     // Wait for the confirm button to be visible before clicking
//     await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//     await metamaskPage.click('[data-testid="confirm-footer-button"]');

//     // Wait for the popup to process the action
//     // await metamaskPage.waitForTimeout(2000);
//   } catch (error) {
//     console.log('Error during MetaMask confirmation (second interaction):', error);
//     // Take a screenshot to help debug
//     try {
//       await metamaskPage.screenshot({ path: 'metamask-error-2.png' });
//       console.log('Screenshot saved as metamask-error-2.png');
//     } catch (screenshotError) {
//       console.log('Could not take screenshot:', screenshotError);
//     }
//     throw error;
//   }


//   await testPage.getByText("1 Signature pending for workflow to be completed").waitFor({ state: 'visible' });

//   console.log("second signature  aqua sign form")
//   //second wallet

//   test.setTimeout(900000)

//   const secondTestPage = await secondWalletResponse.context.pages()[0];




//   // const secondWalletResponse = await secondWalletResponsePromise;
//   // const registerResponse = await registerResponsePromise;

//   context = secondWalletResponse.context;

//   await secondTestPage.reload(); // Reload the second test page to ensure it's up-to-date ie the workflow was shared to ensure its loaded
//   // await secondTestPage.pause();
//   // await testPage.pause();



//   // await secondTestPage.waitForSelector('[data-testid="contracts-shared-button"]', { state: 'visible', timeout: 10000 });
//   // await secondTestPage.click('[data-testid="contracts-shared-button"]')

//   // Try data-testid first, fallback to id if not found
//   try {
//     // First check if the element exists, regardless of visibility
//     console.log('Looking for contracts-shared-button...');

//     // Wait for the element to be in the DOM (not necessarily visible)
//     await secondTestPage.waitForSelector('[data-testid="contracts-shared-button"]', { state: 'attached', timeout: 10000 });

//     // Check if the element is hidden and use JavaScript to click it if necessary
//     const isHidden = await secondTestPage.evaluate(() => {
//       const button = document.querySelector('[data-testid="contracts-shared-button"]');
//       return button && (button.hasAttribute('hidden') ||
//         window.getComputedStyle(button).display === 'none' ||
//         window.getComputedStyle(button).visibility === 'hidden');
//     });

//     if (isHidden) {
//       console.log('contracts-shared-button is hidden, using JavaScript click');
//       await secondTestPage.evaluate(() => {
//         const button = document.querySelector('[data-testid="contracts-shared-button"]');
//         if (button) {
//           (button as HTMLElement).click();
//         }
//       });
//     } else {
//       await secondTestPage.click('[data-testid="contracts-shared-button"]');
//     }
//     console.log('Clicked contracts-shared-button using data-testid');
//   } catch (error) {
//     console.log('data-testid selector not found, trying id selector...', error);
//     try {
//       // Try with ID selector using the same approach
//       await secondTestPage.waitForSelector('#contracts-shared-button-id', { state: 'attached', timeout: 10000 });

//       const isHidden = await secondTestPage.evaluate(() => {
//         const button = document.querySelector('#contracts-shared-button-id');
//         return button && (button.hasAttribute('hidden') ||
//           window.getComputedStyle(button).display === 'none' ||
//           window.getComputedStyle(button).visibility === 'hidden');
//       });

//       if (isHidden) {
//         console.log('contracts-shared-button-id is hidden, using JavaScript click');
//         await secondTestPage.evaluate(() => {
//           const button = document.querySelector('#contracts-shared-button-id');
//           if (button) {
//             (button as HTMLElement).click();
//           }
//         });
//       } else {
//         await secondTestPage.click('#contracts-shared-button-id');
//       }
//       console.log('Clicked contracts-shared-button using id selector');
//     } catch (fallbackError) {
//       console.error('Both selectors failed:', fallbackError);
//       throw new Error('Could not find contracts-shared-button with either data-testid or id selector');
//     }
//   }




//   console.log("Clicked shared contracts button");

//   let number = await findAndClickHighestSharedButton(secondTestPage);
//   if (number === -1 || number === undefined || number === null) {
//     console.log("No shared button found number: " + number);
//     number = 0; // Default to 0 if no button found
//   }
//   // console.log("Clicked contract item  button with index: " + number);
//   //  await secondTestPage.pause();
//   // await testPage.pause();
//   await secondTestPage.waitForSelector('[data-testid="shared-button-count-' + number + '"]', { state: 'visible', timeout: 10000 });
//   await secondTestPage.click('[data-testid="shared-button-count-' + number + '"]')


//   await secondTestPage.waitForTimeout(2000);

//   console.log("Clicked contract item  button with index: " + number);

//   // await secondTestPage.pause();
//   // await testPage.pause();
//   await secondTestPage.waitForSelector('[data-testid="import-aqua-chain-1-button"]', { state: 'visible', timeout: 10000 });
//   await secondTestPage.click('[data-testid="import-aqua-chain-1-button"]')
//   console.log("Clicked import aqua chain button");




//   // await secondTestPage.pause();
//   // await testPage.pause();

//   // await testPage.getByText("Open Workflow").waitFor({ state: 'visible' });
//   // await testPage.getByText("Open Workflow").click();

//   // await testPage.getByText("View Contract Document").waitFor({ state: 'visible' });
//   // await testPage.getByText("View Contract Document").click();

//   // await testPage.getByText("Create Signature").waitFor({ state: 'visible' });
//   // await testPage.getByText("Create Signature").click();

//   // await testPage.getByText("Save Signature").waitFor({ state: 'visible' });
//   // await testPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
//   // await testPage.click('[class="signature-canvas"]');

//   // metamaskPromise = context.waitForEvent("page")
//   // await testPage.getByText("Save Signature").click();
//   // await metamaskPromise;

//   // metamaskPage = context.pages()[1]

//   // await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible' });
//   // await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   // await metamaskPage.waitForEvent("close");
//   // await testPage.getByText("Add Signature to document").waitFor({ state: 'visible' });
//   // await testPage.getByText("Add Signature to document").click();
//   // await testPage.click('[class="css-1exhycx"]')


//   // metamaskPromise = context.waitForEvent("page")
//   // await testPage.getByText("Sign document").click();
//   // await metamaskPromise;

//   // metamaskPage = context.pages()[1]

//   // await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//   // await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   // await testPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });


//   // await secondTestPage.getByText("Open Workflow").waitFor({ state: 'visible' });
//   await secondTestPage.waitForSelector('[data-testid="open-workflow-button"]', { state: 'visible' });
//   // await secondTestPage.getByText("Open Workflow").click();
//   await secondTestPage.click('[data-testid="open-workflow-button"]')


//   //  await secondTestPage.getByText("View Contract Document").waitFor({ state: 'visible' });
//   await secondTestPage.waitForSelector('[data-testid="action-view-contract-button"]', { state: 'visible' });
//   //  await secondTestPage.getByText("View Contract Document").click();
//   await secondTestPage.click('[data-testid="action-view-contract-button"]')

//   //  await secondTestPage.getByText("Create Signature").waitFor({ state: 'visible' });
//   await secondTestPage.waitForSelector('[data-testid="action-create-signature-button"]', { state: 'visible' });
//   //  await secondTestPage.getByText("Create Signature").click();
//   await secondTestPage.click('[data-testid="action-create-signature-button"]')

//   //  await secondTestPage.getByText("Save Signature").waitFor({ state: 'visible' });
//   await secondTestPage.waitForSelector('[data-testid="action-loading-save-signature-button"]', { state: 'visible' });
//   await secondTestPage.waitForSelector('[class="signature-canvas"]', { state: 'visible' });
//   await secondTestPage.click('[class="signature-canvas"]');

//   metamaskPromise = context.waitForEvent("page")
//   //  await secondTestPage.getByText("Save Signature").click();
//   await secondTestPage.click('[data-testid="action-loading-save-signature-button"]')
//   await metamaskPromise;

//   metamaskPage = context.pages()[1]

//   await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible' });
//   await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   await metamaskPage.waitForEvent("close");
//   // await secondTestPage.getByText("Add Signature to document").waitFor({ state: 'visible' });
//   await secondTestPage.waitForSelector('[data-testid="action-signature-to-document-button"]', { state: 'visible' });
//   // await secondTestPage.getByText("Add Signature to document").click();
//   await secondTestPage.click('[data-testid="action-signature-to-document-button"]')

//   await secondTestPage.click('[class="css-1exhycx"]')


//   metamaskPromise = context.waitForEvent("page")
//   await secondTestPage.getByText("Sign document").click();
//   await metamaskPromise;

//   metamaskPage = context.pages()[1]

//   await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', { state: 'visible', timeout: 10000 });
//   await metamaskPage.click('[data-testid="confirm-footer-button"]')

//   await secondTestPage.getByText("Workflow completed and validated").waitFor({ state: 'visible' });

//   console.log("Workflow completed and validated")
// })

