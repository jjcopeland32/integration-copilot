import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const dynamic = 'force-static';

export default async function DocsPage() {
  const file = path.join(process.cwd(), '../../docs/README_full.md');
  let html = '<h1>Docs</h1><p>Add docs/README_full.md</p>';
  try {
    const md = fs.readFileSync(file, 'utf8');
    html = await marked.parse(md);
  } catch {}
  return <article dangerouslySetInnerHTML={{ __html: html }} />;
}