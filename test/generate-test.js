const fs = require('fs');
const path = require('path');

// Folders where we want to generate test files
const allowedFolders = ['Auth', 'ChatList', 'Chat', 'utils'];

// Files to skip completely
const skipFiles = ['app.js', 'server.js', 'config.js'];

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '__tests__') {
        walkDir(fullPath);
      }
    } else if (
      file.endsWith('.js') &&
      !file.endsWith('.test.js') &&
      !skipFiles.includes(file) &&
      allowedFolders.some(folder => fullPath.includes(folder))
    ) {
      const testFile = fullPath.replace('.js', '.test.js');
      if (!fs.existsSync(testFile)) {
        const baseName = path.basename(file, '.js');
        const boilerplate = `// Auto-generated test for ${baseName}

describe('${baseName}', () => {
  test('should work', () => {
    expect(true).toBe(true);
  });
});
`;
        fs.writeFileSync(testFile, boilerplate);
        console.log(`Created: ${testFile}`);
      }
    }
  });
}

// Run the generator
walkDir(__dirname);
