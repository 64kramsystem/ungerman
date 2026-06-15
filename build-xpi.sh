#!/usr/bin/env bash
# Packages the extension into ungerman.xpi (manifest, background scripts, and icons).
# Run from the repo root.

set -o errexit
set -o nounset
set -o pipefail

cd "$(dirname "$(readlink -f "$0")")"

output="ungerman.xpi"

rm -f "$output"
zip -r -FS "$output" manifest.json subject.js background.js icons

echo "Built $output"
