import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const runtimeLine = "export const runtime = 'edge';";
const dynamicLine = "export const dynamic = 'force-dynamic';";

function processDirectory(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            processDirectory(fullPath);
        } else if (dirent.isFile() && dirent.name === 'route.ts') {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            if (!content.includes(runtimeLine)) {
                content = runtimeLine + '\n' + content;
                modified = true;
            }
            if (!content.includes(dynamicLine)) {
                content = dynamicLine + '\n' + content;
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated route: ${fullPath}`);
            }
        }
    });
}

processDirectory(apiDir);
console.log('Finished updating all API routes.');
