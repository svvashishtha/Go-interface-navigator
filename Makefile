# Go Interface Navigator Extension Makefile

.PHONY: help install compile clean package package-clean test

# Default target
help:
	@echo "Available targets:"
	@echo "  install      - Install dependencies"
	@echo "  compile      - Compile TypeScript"
	@echo "  clean        - Clean build artifacts"
	@echo "  package      - Package extension (uses existing build)"
	@echo "  package-clean - Clean, compile, and package extension"
	@echo "  test         - Run tests (if any)"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Compile TypeScript
compile:
	@echo "🔨 Compiling TypeScript..."
	npm run compile

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf out/
	rm -f *.vsix

# Package extension (uses existing build)
package:
	@echo "📦 Packaging extension..."
	npm run package

# Clean, compile, and package extension
package-clean: clean compile package
	@echo "✅ Extension packaged successfully!"

# Run tests (placeholder for future test implementation)
test:
	@echo "🧪 Running tests..."
	@echo "No tests implemented yet." 