import fs from 'fs';
import path from 'path';

const directory = './dist'; // Change if needed

function fixImports(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/from\s+["'](.+?)["']/g, (match, importPath) => {
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) return match; // Skip external packages
        if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
          return `from '${importPath}.js'`;
        }
        return match;
      });
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed imports in ${fullPath}`);
    }
  });
}

fixImports(directory);
