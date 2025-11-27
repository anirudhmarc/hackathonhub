#!/bin/bash
# ============================================================================
# Copy Lambda Function Code to Terraform Directory
# ============================================================================

set -e

SOURCE_DIR="../greataihackaton-hackhub-archive/api-lambda/code"
DEST_DIR="./lambda-code"

echo "🚀 Copying Lambda function code..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy all Lambda function zip files
if [ -d "$SOURCE_DIR" ]; then
    cp -v "$SOURCE_DIR"/*.zip "$DEST_DIR/"
    echo "✅ Successfully copied $(ls -1 "$DEST_DIR"/*.zip 2>/dev/null | wc -l) Lambda function zip files"
else
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# List copied files
echo ""
echo "📦 Lambda functions ready for deployment:"
ls -lh "$DEST_DIR"/*.zip | awk '{print "  - " $9 " (" $5 ")"}'

echo ""
echo "✅ Lambda code copy complete!"
