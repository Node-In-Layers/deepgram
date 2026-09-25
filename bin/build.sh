#!/bin/bash
set -e

rm -Rf ./dist
tsgo -p ./tsconfig.json
tsgo -p ./tsconfig.cli.json
cp package.json ./dist
cp README.md ./dist
cp -R ./bin/ ./dist/
rm -f ./dist/bin/build.sh
rm -f ./dist/bin/nil-deepgram.mts

sed -i -e 's#../src/#../#g' ./dist/bin/nil-deepgram.mjs
chmod +x ./dist/bin/nil-deepgram
chmod +x ./bin/nil-deepgram
