#!/bin/bash

# Use this script to generate users' password's hash before inserting to the database.

# Usage: ./generateHash.sh <password>

# To run it as a npm script
# Usage: npm run generate-hash -- <password>

hash="$(htpasswd -bnBC 10 "" $1 | tr -d ':\n' | sed 's/$2y/$2b/')";
echo $hash;
