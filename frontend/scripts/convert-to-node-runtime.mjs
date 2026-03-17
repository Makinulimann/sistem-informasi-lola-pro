/**
 * Script to convert all API routes from Edge to Node.js runtime
 * Run: node scripts/convert-to-node-runtime.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function processDirectory(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      processDirectory(fullPath);
    } else if (dirent.isFile() && dirent.name === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // Replace edge with nodejs
      if (content.includes("export const runtime = 'edge'")) {
        content = content.replace(
          "export const runtime = 'edge';",
          "// Using Node.js runtime for Prisma compatibility\nexport const runtime = 'nodejs';"
        );
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated: ${path.relative(__dirname, fullPath)}`);
      }
    }
  });
}

console.log('Converting API routes to Node.js runtime...\n');
processDirectory(apiDir);
console.log('\nDone!');
