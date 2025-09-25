# GitHub Actions Setup

This repository includes a GitHub Action workflow that automatically checks for the presence of a VSIX file matching the version in `package.json` and publishes it to the VS Code Marketplace.

## Workflow Overview

The workflow (`publish-extension.yml`) performs the following steps:

1. **Version Check**: Extracts the version from `package.json`
2. **VSIX Validation**: Checks if a VSIX file exists with the expected name format: `go-interface-navigator-{version}.vsix`
3. **Marketplace Publication**: Publishes the extension to the VS Code Marketplace (on main/master branch or tags)
4. **GitHub Release**: Creates a GitHub release with the VSIX file attached (on version tags)
5. **Artifact Upload**: Uploads the VSIX file as a workflow artifact

## Setup Requirements

### 1. VS Code Marketplace Personal Access Token

To publish to the VS Code Marketplace, you need to set up a Personal Access Token (PAT):

1. Go to [Azure DevOps](https://dev.azure.com)
2. Create a personal access token with **Marketplace (Publish)** scope
3. Add this token as a repository secret named `VSCE_PAT`:
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: `VSCE_PAT`
   - Value: Your personal access token

### 2. Workflow Triggers

The workflow runs on:
- **Push to main/master**: Publishes the extension
- **Version tags** (v1.0.0, v0.1.8, etc.): Publishes and creates a GitHub release
- **Pull requests**: Performs dry-run validation only
- **Manual trigger**: Can be run manually from the Actions tab

## Usage Instructions

### Method 1: Manual Workflow Trigger
1. Ensure your VSIX file exists and matches the package.json version
2. Go to the "Actions" tab in your repository
3. Select "Publish VS Code Extension"
4. Click "Run workflow"

### Method 2: Version Tag Release
1. Update `package.json` version
2. Create and push matching VSIX file
3. Create and push a version tag:
   ```bash
   git tag v0.1.8
   git push origin v0.1.8
   ```

### Method 3: Push to Main Branch
1. Push your changes to the main/master branch
2. The workflow will automatically run and publish if a matching VSIX file exists

## File Requirements

- The VSIX file must exist in the repository root
- File naming convention: `go-interface-navigator-{version}.vsix`
- Example: For version `0.1.7` in package.json, the file should be `go-interface-navigator-0.1.7.vsix`

## Workflow Behavior

- **Pull Requests**: Only validates the VSIX file exists and is valid (no publishing)
- **Main/Master Branch**: Publishes to VS Code Marketplace
- **Version Tags**: Publishes to marketplace AND creates GitHub release
- **Other Branches**: No action taken

## Troubleshooting

### Common Issues

1. **VSIX file not found**
   - Ensure the VSIX file exists in the repository root
   - Check the file name matches exactly: `go-interface-navigator-{version}.vsix`
   - Verify the version in package.json matches the VSIX filename

2. **Publishing fails**
   - Check that `VSCE_PAT` secret is properly set
   - Ensure the PAT has Marketplace (Publish) permissions
   - Verify you're the publisher or have publish rights

3. **Workflow doesn't trigger**
   - Check that you're pushing to main/master branch or using version tags
   - Ensure the workflow file is in `.github/workflows/` directory

### Manual Validation

You can manually validate your setup by running:
```bash
# Check if the expected VSIX file exists
VERSION=$(node -p "require('./package.json').version")
ls -la "go-interface-navigator-$VERSION.vsix"

# Validate the VSIX file
npx @vscode/vsce show "go-interface-navigator-$VERSION.vsix"
```
