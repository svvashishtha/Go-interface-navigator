# Go Interface Navigator

A VS Code extension that provides intelligent navigation between interface declarations and their implementations using CodeLens.

## Features

- Shows CodeLens indicators next to interface methods and their implementations
- Two-way navigation:
  - Down arrow (↓) next to interface method declarations to navigate to implementations
  - Up arrow (↑) next to method implementations to navigate to their interface declarations
- Works with Go files
- Updates in real-time as you edit your code
- Provides visual feedback when no implementation is found

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the extension
4. Press F5 in VS Code to start debugging and test the extension

## Usage

1. Open a Go file containing interfaces and their implementations
2. You'll see two types of CodeLens indicators:
   - ↓ "Go to Implementation" next to interface method declarations
   - ↑ "Go to Interface" next to method implementations
3. Click on either indicator to navigate between interface and implementation
4. If no implementation is found, you'll see an information message

## Requirements

- VS Code 1.60.0 or higher
- Go files

## Extension Settings

This extension contributes the following settings:

* `go-interface-navigator.enable`: Enable/disable the extension
* `go-interface-navigator.arrowColor`: Customize the arrow color (default: #007acc)

## Known Issues

- Currently only supports Go files
- May not work with all interface/method declaration patterns
- Navigation is limited to the current file

## Release Notes

### 0.0.1

Initial release of Method Navigator:
- CodeLens-based navigation between interfaces and implementations
- Two-way navigation support (interface to implementation and vice versa)
- Support for Go files
- Visual feedback for missing implementations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 