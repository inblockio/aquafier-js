// Function to check if a specific Chrome extension is installed
export function isExtensionInstalled(extensionId: string) {
      return new Promise((resolve, _reject) => {
            if (!chrome || !chrome.runtime) {
                  resolve(false)
                  return
            }

            try {
                  chrome.runtime.sendMessage(extensionId, { type: 'CHECK_INSTALLED' }, _response => {
                        if (chrome.runtime.lastError) {
                              // Extension is not installed or cannot be contacted
                              resolve(false)
                        } else {
                              // Extension is installed and responded
                              resolve(true)
                        }
                  })
            } catch (error) {
                  console.error(error)
                  // Any error means the extension is not installed
                  resolve(false)
            }
      })
}

// Function to send a message to a specific extension
export function sendMessageToExtension(extensionId: string, message: any) {
      return new Promise((resolve, reject) => {
            if (!chrome || !chrome.runtime) {
                  reject(new Error('Chrome runtime not available'))
                  return
            }

            try {
                  chrome.runtime.sendMessage(extensionId, message, response => {
                        if (chrome.runtime.lastError) {
                              reject(new Error('Failed to send message: ' + chrome.runtime.lastError.message))
                              return
                        }
                        resolve(response)
                  })
            } catch (error) {
                  reject(error)
            }
      })
}

// Example usage
export async function checkAndUseExtension() {
      const EXTENSION_ID = 'your-extension-id-here' // Replace with actual extension ID

      try {
            // Check if extension is installed
            const isInstalled = await isExtensionInstalled(EXTENSION_ID)

            if (isInstalled) {
                  //  //  console.log('Extension is installed!');

                  // Example: Call a specific function in the extension
                  await sendMessageToExtension(EXTENSION_ID, {
                        type: 'CALL_SPECIFIC_FUNCTION',
                        data: {
                              functionName: 'exampleFunction',
                              params: {
                                    arg1: 'value1',
                                    arg2: 'value2',
                              },
                        },
                  })

                  //  console.log('Function call result:', result)
            } else {
                  //  console.log('Extension is not installed.')
            }
      } catch (error) {
            console.error('Error checking extension:', error)
      }
}

// Companion extension background script (to be added to the extension's background.js)
export function setupExtensionListener() {
      chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
            switch (message.type) {
                  case 'CHECK_INSTALLED':
                        // Simply respond to confirm the extension is available
                        sendResponse({ status: 'INSTALLED' })
                        break

                  case 'CALL_SPECIFIC_FUNCTION':
                        // Handle specific function calls
                        switch (message.data.functionName) {
                              case 'exampleFunction':
                                    const result = performExampleFunction(message.data.params)
                                    sendResponse(result)
                                    break
                              default:
                                    sendResponse({ error: 'Unknown function' })
                        }
                        return true // Indicates we wish to send a response asynchronously
            }
      })
}

// Example function that might be called from outside
export function performExampleFunction(params: any) {
      //  //  console.log('Example function called with params:', params);
      return {
            success: true,
            message: 'Function executed successfully',
            receivedParams: params,
      }
}

// Call the check function
checkAndUseExtension()
