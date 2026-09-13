#!/bin/sh
# Restore the immutable comparison fixture using only already-fetched Git data.
set -eu
mkdir -p tmp/baseline-app
git -c safe.directory="$(pwd)" archive a1ffa11fd13341ffe6f1495ecbc1d32c09245ca7 | tar -x -C tmp/baseline-app
