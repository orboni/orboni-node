// dist/cjs is CommonJS inside a "type": "module" package: say so beside it.
import { writeFile } from 'node:fs/promises';

await writeFile(new URL('../dist/cjs/package.json', import.meta.url), '{ "type": "commonjs" }\n');
