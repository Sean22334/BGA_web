import path from 'node:path';
import { rm } from 'node:fs/promises';

export default async function cleanup() {
  const root = path.resolve('test-results');
  const uploads = path.resolve(root, 'cms-uploads');
  if (path.dirname(uploads) !== root) throw new Error('Unexpected test upload directory.');
  await rm(uploads, { recursive: true, force: true });
}
