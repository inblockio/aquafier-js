
echo "Git pre-commit hook installed successfully!"

# Generate initial version info file if it doesn't exist
if [ ! -f ./web/src/version-info.json ]; then
  # Get current commit hash
  COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  
  # Date for versioning
  COMMIT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Create the directory if it doesn't exist
  mkdir -p ./web/src
  
  # Create a JSON file with the version info
  echo "{
    \"commitHash\": \"${COMMIT_HASH}\",
    \"buildDate\": \"${COMMIT_DATE}\"
  }" > ./web/src/version-info.json
  
  echo "Created initial version-info.json file"
fi
