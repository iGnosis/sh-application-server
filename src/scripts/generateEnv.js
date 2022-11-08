#!/usr/bin/env node

// What this does:
// Reads sample file
// Reads env variables - process.env
// Replaces sample file's dummy values

const { readFileSync, writeFileSync, write } = require('fs');

try {
  const data = readFileSync('.env.sample', 'utf-8');
  const rows = data.split('\n');
  const varRegex = /^([\w]+)=(.+)$/;

  rows.forEach((row, index) => {
    const match = varRegex.exec(row);
    if (match) {
      const varName = match[1];
      if (varName in process.env) {
        rows[index] = `${varName}=${process.env[varName]}`;
        writeFileSync('./.env', `${rows[index]}\n`, { flag: 'a+' });
      }
    }
  });
} catch (err) {
  console.log(err);
}
