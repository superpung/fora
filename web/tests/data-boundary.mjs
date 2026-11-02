// Keep conference content outside every code commit.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const paths = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n');
const forbidden = paths.filter(p => /^(data\/|source\/(raw|extracted|identities)\/|web\/(public\/portraits|src\/data)\/)/.test(p)
  || /^source\/[^/]+\/(raw\/|enrichment\.json|curation\.json)/.test(p));
assert.deepEqual(forbidden, [], 'Conference content belongs in external maintenance storage');
console.log('PASS code/data boundary');
