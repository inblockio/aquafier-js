#!/bin/bash
METAMASK_DIR=e2e/metamask-extension
if [ ! -d "$METAMASK_DIR" ]; then
  wget https://github.com/MetaMask/metamask-extension/releases/download/v12.20.1/metamask-chrome-12.20.1.zip -O e2e/metamask.zip
  unzip -d $METAMASK_DIR e2e/metamask.zip
  rm e2e/metamask.zip
fi