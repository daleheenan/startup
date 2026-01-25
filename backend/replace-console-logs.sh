#!/bin/bash

# Script to replace console.log/error/warn statements with structured Pino logging

# Function to add logger import if not present
add_logger_import() {
    local file=$1
    local router_name=$(basename "$file" .ts)

    # Check if logger import already exists
    if grep -q "createLogger" "$file"; then
        echo "Logger already imported in $file"
        return
    fi

    # Check for Express import patterns to insert after
    if grep -q "from 'express'" "$file"; then
        # Add import after the last import statement
        sed -i "/^import.*from.*;$/a import { createLogger } from '../services/logger.service.js';" "$file"

        # Add logger constant after router declaration
        sed -i "/const router = /a const logger = createLogger('routes:$router_name');" "$file"

        echo "Added logger import to $file"
    fi
}

# Function to replace console.error patterns
replace_console_errors() {
    local file=$1

    # Replace console.error with logger.error
    # Pattern 1: console.error('[Something] Message:', error);
    sed -i "s/console\.error('\[.*\] \(.*\):', error);/logger.error({ error: error instanceof Error ? error.message : error }, '\1');/g" "$file"

    # Pattern 2: console.error('Message:', error);
    sed -i "s/console\.error('\(.*\):', error);/logger.error({ error: error instanceof Error ? error.message : error }, '\1');/g" "$file"

    echo "Replaced console.error in $file"
}

# Function to replace console.log patterns
replace_console_logs() {
    local file=$1

    # Replace console.log with logger.info
    # This is more complex and requires manual review, so just do basic replacement
    sed -i "s/console\.log('\[.*\] \(.*\)');/logger.info('\1');/g" "$file"
    sed -i "s/console\.log('\(.*\)');/logger.info('\1');/g" "$file"

    echo "Replaced console.log in $file"
}

# Function to replace console.warn patterns
replace_console_warns() {
    local file=$1

    sed -i "s/console\.warn('\[.*\] \(.*\)');/logger.warn('\1');/g" "$file"
    sed -i "s/console\.warn('\(.*\)');/logger.warn('\1');/g" "$file"

    echo "Replaced console.warn in $file"
}

# Process all route files
for file in src/routes/*.ts; do
    if grep -q "console\." "$file"; then
        echo "Processing $file..."
        add_logger_import "$file"
        replace_console_errors "$file"
        replace_console_logs "$file"
        replace_console_warns "$file"
    fi
done

echo "Done! Review changes and test."
