#!/bin/bash

# Tauri Project Version Update Script
# Usage: ./update-version.sh <version>
# Example: ./update-version.sh 1.2.3

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if ! command -v sed &> /dev/null; then
        missing_deps+=("sed")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                jq)
                    echo "  macOS: brew install jq"
                    echo "  Linux: sudo apt-get install jq or sudo yum install jq"
                    ;;
            esac
        done
        exit 1
    fi
    
    print_success "All dependencies installed"
}

# Validate version format
validate_version() {
    local version=$1
    
    # Validate semantic version format (supports 1.2.3 or 1.2.3-beta.1 etc.)
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
        print_error "Invalid version format: $version"
        echo "Version number should follow semantic versioning format, e.g.: 1.2.3 or 1.2.3-beta.1"
        exit 1
    fi
    
    print_success "Valid version format: $version"
}

# Check if files exist
check_files() {
    print_info "Checking project files..."
    
    local files=(
        "package.json"
        "package-lock.json"
        "src-tauri/Cargo.toml"
        "src-tauri/Cargo.lock"
        "src-tauri/tauri.conf.json"
    )
    
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Missing files: ${missing_files[*]}"
        echo "Please ensure you are running this script in the Tauri project root directory"
        exit 1
    fi
    
    print_success "All required files exist"
}


# Update package.json
update_package_json() {
    local version=$1
    local file="package.json"
    
    print_info "Updating $file..."
    
    # Update version number using jq
    jq --arg version "$version" '.version = $version' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
    
    print_success "Updated $file"
}

# Update package-lock.json
update_package_lock_json() {
    local version=$1
    local file="package-lock.json"
    
    print_info "Updating $file..."
    
    # Update top-level version and version in packages.""
    jq --arg version "$version" '
        .version = $version |
        .packages."".version = $version
    ' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
    
    print_success "Updated $file"
}

# Update Cargo.toml
update_cargo_toml() {
    local version=$1
    local file="src-tauri/Cargo.toml"
    
    print_info "Updating $file..."
    
    # Check operating system to use compatible sed command
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "0,/^version = .*$/s//version = \"$version\"/" "$file"
    else
        # Linux
        sed -i "0,/^version = .*$/s//version = \"$version\"/" "$file"
    fi
    
    print_success "Updated $file"
}

# Update Cargo.lock
update_cargo_lock() {
    local version=$1
    local file="src-tauri/Cargo.lock"
    
    print_info "Updating $file..."
    
    # Get project name
    local package_name=$(grep -m 1 '^name = ' src-tauri/Cargo.toml | sed 's/name = "\(.*\)"/\1/')
    
    # Check operating system
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: Find project name in [[package]] block and update version after it
        sed -i '' "/\[\[package\]\]/,/^$/ {
            /name = \"$package_name\"/,/^version = / {
                s/^version = \".*\"/version = \"$version\"/
            }
        }" "$file"
    else
        # Linux
        sed -i "/\[\[package\]\]/,/^$/ {
            /name = \"$package_name\"/,/^version = / {
                s/^version = \".*\"/version = \"$version\"/
            }
        }" "$file"
    fi
    
    print_success "Updated $file"
}

# Update tauri.conf.json
update_tauri_conf() {
    local version=$1
    local file="src-tauri/tauri.conf.json"
    
    print_info "Updating $file..."
    
    # Version number may be in package.version or version field in Tauri config file
    # Try to update possible existing fields
    jq --arg version "$version" '
        if .package then
            .package.version = $version
        else . end |
        if .version then
            .version = $version
        else . end
    ' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"
    
    print_success "Updated $file"
}

# Main function
main() {
    echo ""
    echo "=========================================="
    echo "  Tauri project version update script"
    echo "=========================================="
    echo ""
    
    # Check parameters
    if [ $# -eq 0 ]; then
        print_error "Missing version number parameter"
        echo "Usage: $0 <version>"
        echo "Example: $0 1.2.3"
        exit 1
    fi
    
    local NEW_VERSION=$1
    
    # Execute checks
    check_dependencies
    validate_version "$NEW_VERSION"
    check_files
    
    echo ""
    print_info "Preparing to update version to: $NEW_VERSION"
    echo ""
    
    # Update all files
    update_package_json "$NEW_VERSION"
    update_package_lock_json "$NEW_VERSION"
    update_cargo_toml "$NEW_VERSION"
    update_cargo_lock "$NEW_VERSION"
    update_tauri_conf "$NEW_VERSION"
    
    echo ""
    
    
    echo ""
    echo "=========================================="
    print_success "Version update completed!"
    echo "=========================================="
    echo ""
}

main "$@"

