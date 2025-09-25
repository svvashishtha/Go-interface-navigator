#!/bin/bash

# Go Interface Navigator Extension Release Validation Script

set -e  # Exit on any error

echo "🔍 Validating Go Interface Navigator Extension Release..."

# Get package version
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in current directory"
    exit 1
fi

VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Failed to read version from package.json"
    echo "Make sure Node.js is installed and package.json is valid"
    exit 1
fi

echo "📦 Package version: $VERSION"

# Check if VSIX file exists
EXPECTED_VSIX="go-interface-navigator-$VERSION.vsix"
echo "🔍 Looking for VSIX file: $EXPECTED_VSIX"

if [ -f "$EXPECTED_VSIX" ]; then
    echo "✅ VSIX file found: $EXPECTED_VSIX"
else
    echo "❌ VSIX file not found: $EXPECTED_VSIX"
    echo ""
    echo "Available .vsix files in current directory:"
    ls -la *.vsix 2>/dev/null || echo "No .vsix files found"
    echo ""
    echo "To create the VSIX file, run:"
    echo "./package-extension.sh"
    exit 1
fi

# Check file size (should be reasonable for a VS Code extension)
FILE_SIZE=$(stat -f%z "$EXPECTED_VSIX" 2>/dev/null || stat -c%s "$EXPECTED_VSIX" 2>/dev/null)
if [ -n "$FILE_SIZE" ]; then
    if [ "$FILE_SIZE" -gt 0 ]; then
        # Convert bytes to human readable format
        if [ "$FILE_SIZE" -gt 1048576 ]; then
            SIZE_MB=$((FILE_SIZE / 1048576))
            echo "📏 File size: ${SIZE_MB}MB"
        elif [ "$FILE_SIZE" -gt 1024 ]; then
            SIZE_KB=$((FILE_SIZE / 1024))
            echo "📏 File size: ${SIZE_KB}KB"
        else
            echo "📏 File size: ${FILE_SIZE} bytes"
        fi
    else
        echo "❌ VSIX file is empty"
        exit 1
    fi
fi

# Check if vsce is available and validate the package
if command -v vsce &> /dev/null; then
    echo "🔧 Validating VSIX package with vsce..."
    if vsce show "$EXPECTED_VSIX" &> /dev/null; then
        echo "✅ VSIX package is valid"
    else
        echo "❌ VSIX package validation failed"
        echo "Try rebuilding with: ./package-extension.sh"
        exit 1
    fi
else
    echo "⚠️  vsce not found - skipping package validation"
    echo "To install vsce: npm install -g @vscode/vsce"
fi

# Check Git status
if [ -d ".git" ]; then
    echo "🔍 Checking Git status..."
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  You have uncommitted changes:"
        git status --short
        echo ""
        echo "Consider committing changes before publishing"
    else
        echo "✅ Working directory is clean"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo "🌿 Current branch: $CURRENT_BRANCH"
    
    # Check if version tag exists
    VERSION_TAG="v$VERSION"
    if git tag -l | grep -q "^$VERSION_TAG$"; then
        echo "✅ Version tag exists: $VERSION_TAG"
    else
        echo "ℹ️  Version tag does not exist: $VERSION_TAG"
        echo "To create and push tag:"
        echo "git tag $VERSION_TAG && git push origin $VERSION_TAG"
    fi
else
    echo "⚠️  Not a Git repository - skipping Git checks"
fi

echo ""
echo "🎉 Validation complete!"
echo ""
echo "📋 Release checklist:"
echo "  ✅ package.json version: $VERSION"
echo "  ✅ VSIX file exists: $EXPECTED_VSIX"
echo "  $([ -f "$EXPECTED_VSIX" ] && echo "✅" || echo "❌") VSIX file validated"
echo ""
echo "🚀 Ready to publish!"
echo ""
echo "Publishing options:"
echo "1. Push to main/master branch (auto-publishes)"
echo "2. Create version tag: git tag v$VERSION && git push origin v$VERSION"
echo "3. Manually trigger GitHub Action from repository Actions tab"
echo "4. Manual publish: vsce publish --packagePath $EXPECTED_VSIX"
