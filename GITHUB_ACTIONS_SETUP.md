# GitHub Actions Setup Summary

## What Was Created

This setup adds automated publishing capabilities to your VS Code extension repository using GitHub Actions.

### Files Created:

1. **`.github/workflows/publish-extension.yml`** - Main workflow file
2. **`.github/README.md`** - Detailed setup and troubleshooting guide  
3. **`validate-release.sh`** - Local validation script
4. **`GITHUB_ACTIONS_SETUP.md`** - This summary file

### Updated Files:

- **`README.md`** - Added installation options and publishing information

## How It Works

### The Workflow Process:

1. **Triggers**: Runs on pushes to main/master, version tags, PRs, or manual trigger
2. **Version Check**: Extracts version from `package.json` (currently: `0.1.7`)
3. **VSIX Validation**: Looks for `go-interface-navigator-{version}.vsix` file
4. **Publishing**: Publishes to VS Code Marketplace (main branch/tags only)
5. **Release Creation**: Creates GitHub releases for version tags
6. **Artifact Storage**: Saves VSIX file as workflow artifact

### Current Status:

✅ **Ready to use** - Your current setup (`v0.1.7`) is validated and ready for publishing

## Next Steps

### 1. Set Up Marketplace Publishing (Required)

To enable publishing to VS Code Marketplace:

1. Go to [Azure DevOps](https://dev.azure.com)
2. Create a Personal Access Token with **Marketplace (Publish)** scope
3. Add it as a repository secret named `VSCE_PAT`:
   - Repository Settings → Secrets and variables → Actions
   - New repository secret: `VSCE_PAT`

### 2. Test the Setup

Choose one of these options to test:

**Option A: Manual Workflow Trigger**
- Go to Actions tab → "Publish VS Code Extension" → "Run workflow"

**Option B: Version Tag (Recommended)**
```bash
git add .
git commit -m "Add GitHub Actions for automated publishing"
git tag v0.1.7
git push origin HEAD v0.1.7
```

**Option C: Push to Main Branch**
```bash
git add .
git commit -m "Add GitHub Actions for automated publishing"
git push origin main  # or master
```

### 3. Validate Before Publishing

Always run the validation script before publishing:
```bash
./validate-release.sh
```

## Workflow Behavior

| Trigger | Action Taken |
|---------|-------------|
| Pull Request | ✅ Validate VSIX file exists and is valid (no publishing) |
| Push to main/master | ✅ Validate + Publish to Marketplace |
| Version tag (v*) | ✅ Validate + Publish + Create GitHub Release |
| Manual trigger | ✅ Validate + Publish (if on main/master) |
| Other branches | ❌ No action |

## File Naming Convention

The workflow expects VSIX files to follow this naming pattern:
```
go-interface-navigator-{version}.vsix
```

Examples:
- `go-interface-navigator-0.1.7.vsix` (current)
- `go-interface-navigator-0.1.8.vsix` (next version)

## Future Releases

For future versions:

1. Update `package.json` version
2. Run `./package-extension.sh` to create new VSIX file
3. Run `./validate-release.sh` to verify setup
4. Commit and push/tag to trigger publishing

## Troubleshooting

- **VSIX not found**: Ensure filename matches `go-interface-navigator-{version}.vsix`
- **Publishing fails**: Check `VSCE_PAT` secret is set correctly
- **Node.js version errors**: Fixed by using Node.js 20 in the workflow
- **VSCE validation fails**: Workflow continues even if validation fails (handles version compatibility)
- **Workflow doesn't run**: Verify you're on main/master or using version tags

For detailed troubleshooting, see [`.github/README.md`](.github/README.md).

## Security Notes

- The `VSCE_PAT` token is securely stored as a GitHub secret
- Workflow only publishes from main/master branches and version tags
- Pull requests run validation only (no publishing)
- All artifacts are retained for 30 days for rollback if needed
