import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = join(root, 'packages/engine/infrastructure/src/persistence/migrations');
const modules = [
  ['hub', 'Hub (v001–v099)'],
  ['spending', 'Chi tiêu (v100–v199)'],
  ['recipes', 'Món ăn (v200–v299)'],
];

function section([folder, title]) {
  const files = readdirSync(join(migrations, folder)).filter((name) => name.endsWith('.sql')).sort();
  const blocks = files.map((name) => {
    const sql = readFileSync(join(migrations, folder, name), 'utf8').trim();
    return `### ${name}\n\n\`\`\`sql\n${sql}\n\`\`\``;
  });
  return `## ${title}\n\n${blocks.join('\n\n')}`;
}

const header = `# Cơ sở dữ liệu

File này được sinh từ các migration trong \`packages/engine/infrastructure/src/persistence/migrations/\`. **Không sửa tay**: sửa file SQL rồi chạy \`node scripts/gen-schema-doc.mjs\`.

Quy ước chung nằm ở \`.claude/rules/database-migrations-rules.md\`: khoá chính là \`TEXT\`, tiền là số nguyên đồng (\`*_vnd\`), ngày là \`YYYY-MM-DD\`, \`updated_at\` là đồng hồ lai (HLC), xoá mềm bằng \`deleted_at\`, và không khai báo khoá ngoại cứng.
`;

writeFileSync(join(root, 'docs/database-schema.md'), `${header}\n${modules.map(section).join('\n\n')}\n`);
