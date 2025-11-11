#!/bin/bash
# Build script for Lambda Layer

set -e

echo "Building Lambda Layer..."

# Install dependencies in root
cd "$(dirname "$0")"
npm install

# Copy node_modules to nodejs/ (Lambda layer structure)
echo "Copying node_modules to nodejs/..."
rm -rf nodejs/node_modules
mkdir -p nodejs

# Copy package.json first
cp package.json nodejs/

# Install only production dependencies in nodejs directory
echo "Installing production dependencies in nodejs/..."
cd nodejs
npm install --production --no-save
# Ensure @prisma/client is installed for generation
npm install @prisma/client prisma --no-save
cd ..

# Copy Prisma schema to nodejs directory for generation
cp ../../prisma/schema.prisma nodejs/schema.prisma

# Generate Prisma Client with Lambda-compatible binaries in nodejs directory
cd nodejs
echo "Generating Prisma Client..."
npx prisma generate --schema=./schema.prisma
# Remove prisma CLI after generation (not needed in layer)
rm -rf node_modules/prisma
cd ..

# Clean up unnecessary files to reduce layer size
echo "Cleaning up unnecessary files..."
cd nodejs/node_modules

# Remove large unused packages
if [ -d "effect" ]; then
  echo "Removing unused 'effect' package..."
  rm -rf effect
fi

# Remove source maps, tests, docs, etc.
find . -name "*.map" -delete 2>/dev/null || true
find . -name "*.test.js" -delete 2>/dev/null || true
find . -name "*.spec.js" -delete 2>/dev/null || true
find . -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.md" -delete 2>/dev/null || true
find . -name "*.ts" ! -path "*/node_modules/@prisma/client/*" -delete 2>/dev/null || true
find . -name "*.d.ts" ! -path "*/node_modules/@prisma/client/*" -delete 2>/dev/null || true

# Remove Prisma query engine binaries we don't need (keep only rhel-openssl-3.0.x)
if [ -d "@prisma/client" ]; then
  echo "Optimizing Prisma binaries..."
  cd @prisma/client
  # Keep only the binaries we need for Lambda
  find . -name "query-engine-*" ! -name "*rhel-openssl-3.0.x*" -delete 2>/dev/null || true
  find . -name "schema-engine-*" ! -name "*rhel-openssl-3.0.x*" -delete 2>/dev/null || true
  cd ..
fi

cd ../../..

echo "✅ Lambda Layer built successfully!"
echo "Layer structure: nodejs/node_modules/"

