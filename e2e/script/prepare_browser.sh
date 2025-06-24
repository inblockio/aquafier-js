#!/bin/bash
METAMASK_DIR=e2e/metamask-extension
if [ ! -d "$METAMASK_DIR" ]; then
  wget https://github.com/MetaMask/metamask-extension/releases/latest/download/metamask-chrome-12.20.0.zip -O e2e/metamask.zip
  unzip -d $METAMASK_DIR e2e/metamask.zip
  rm e2e/metamask.zip
fi