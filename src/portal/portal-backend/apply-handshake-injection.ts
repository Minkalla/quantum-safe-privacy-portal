import fs from 'fs';
import path from 'path';

const targetFile = path.join(
  __dirname,
  'src',
  'portal',
  'portal-backend',
  'src',
  'services',
  'auth.service.ts'
);

let source = fs.readFileSync(targetFile, 'utf8');

// Check if it's already injected
if (source.includes('triggerPQCHandshake')) {
  console.log('🟡 PQC handshake already wired. No changes made.');
  process.exit(0);
}

// Step 1: Add import
if (!source.includes("import { triggerPQCHandshake }")) {
  source = source.replace(
    /^(import .*?;)(\s*\n)/m,
    `$1\nimport { triggerPQCHandshake } from '../services/pqc.service';\n`
  );
}

// Step 2: Insert handshake after await user.save()
source = source.replace(
  /(await user\.save\(\);)/,
  `$1\n\n    // 👋 Post-login PQC handshake\n    await triggerPQCHandshake(user._id.toString());`
);

fs.writeFileSync(targetFile, source);

console.log('✅ PQC handshake injected into auth.service.ts');
