#!/bin/bash
#
# Xcode Cloud runs this right after cloning. It must live in ios/ci_scripts/,
# next to ColdBoot.xcworkspace, and be executable.
#
# The clone has no node_modules and no Pods. Without this script the workspace
# points at a Pods project that doesn't exist, and xcodebuild fails within
# seconds with exit code 65.

set -euo pipefail

export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_ENV_HINTS=1

# package.json requires Node >= 20. node@22 is keg-only, so put it on PATH.
brew install node@22
NODE_PREFIX="$(brew --prefix node@22)"
export PATH="$NODE_PREFIX/bin:$PATH"
echo "Using node $(node --version), npm $(npm --version)"

brew install cocoapods

# Repo root. Runs patch-package and the codegen patch via postinstall.
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

# Xcode's script phases (JS bundling, codegen) take NODE_BINARY from
# .xcode.env, which resolves `node` from PATH. Build phases don't inherit this
# script's PATH, so pin the absolute path in the untracked local override that
# React Native sources after .xcode.env.
echo "export NODE_BINARY=$NODE_PREFIX/bin/node" > ios/.xcode.env.local

cd ios
pod install
