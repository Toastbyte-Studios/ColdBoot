import fs from 'fs';
import path from 'path';

/**
 * Routes load their screens with an inline `require` (see the note in
 * AppNavigator). TypeScript does not check a `require` path, so a typo
 * would only show up when someone opened that screen. This checks every
 * path at test time instead.
 */
const navigatorPath = path.join(
  __dirname,
  '../src/navigation/AppNavigator.tsx',
);
// Without block comments: the file's own note shows an example route.
const source = fs
  .readFileSync(navigatorPath, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const requiredPaths = [...source.matchAll(/require\(\s*'([^']+)'\s*\)/g)].map(
  (match) => match[1],
);

describe('AppNavigator lazy routes', () => {
  it('loads screens lazily', () => {
    expect(requiredPaths.length).toBeGreaterThan(80);
  });

  it.each(requiredPaths)('%s resolves to a screen module', (required) => {
    const file = `${path.resolve(path.dirname(navigatorPath), required)}.tsx`;

    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toMatch(/export default/);
  });

  it('gives every route a component', () => {
    const routes = source.match(/<Stack\.Screen\b/g)?.length ?? 0;
    const withGetComponent = source.match(/getComponent=\{/g)?.length ?? 0;
    const withComponent = source.match(/\bcomponent=\{/g)?.length ?? 0;
    // DownloadArea renders its screen from a child function.
    const withChildren = source.match(/<\/Stack\.Screen>/g)?.length ?? 0;

    expect(withGetComponent + withComponent + withChildren).toBe(routes);
  });

  it('registers each route name once', () => {
    const names = [...source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(new Set(names).size).toBe(names.length);
  });
});
