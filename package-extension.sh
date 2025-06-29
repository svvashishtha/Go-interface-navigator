#!/bin/bash

# Go Interface Navigator Extension Packaging Script

set -e  # Exit on any error

echo "🚀 Packaging Go Interface Navigator Extension..."

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo "❌ vsce is not installed. Installing it now..."
    npm install -g @vscode/vsce
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out/
rm -f *.vsix

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Check if compilation was successful
if [ ! -d "out" ]; then
    echo "❌ Compilation failed. out/ directory not found."
    exit 1
fi

# Package the extension
echo "📦 Packaging extension..."
vsce package

# Check if packaging was successful
if [ -f "*.vsix" ]; then
    echo "✅ Extension packaged successfully!"
    echo "📁 Extension file: $(ls *.vsix)"
    echo ""
    echo "To install the extension:"
    echo "1. Open VS Code"
    echo "2. Go to Extensions (Ctrl+Shift+X)"
    echo "3. Click the '...' menu and select 'Install from VSIX...'"
    echo "4. Select the generated .vsix file"
    echo ""
    echo "Or install via command line:"
    echo "code --install-extension *.vsix"
else
    echo "❌ Packaging failed. No .vsix file found."
    exit 1
fi 