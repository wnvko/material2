import {existsSync, readFileSync} from 'fs';
import {sync as glob} from 'glob';
import {basename, dirname, isAbsolute, join} from 'path';
import * as semver from 'semver';
import * as ts from 'typescript';
import {Version} from '../version-name/parse-version';

/** RegExp that matches Angular component inline styles that contain a sourcemap reference. */
const inlineStylesSourcemapRegex = /styles: ?\[["'].*sourceMappingURL=.*["']/;

/** RegExp that matches Angular component metadata properties that refer to external resources. */
const externalReferencesRegex = /(templateUrl|styleUrls): *["'[]/;

/**
 * List of fields which are mandatory in entry-point "package.json" files and refer
 * to files in the release output.
 */
const packageJsonPathFields =
    ['main', 'module', 'typings', 'es2015', 'fesm5', 'fesm2015', 'esm5', 'esm2015'];

/**
 * Checks the specified release bundle and ensures that it does not contain
 * any external resource URLs.
 */
export function checkReleaseBundle(bundlePath: string): string[] {
  const bundleContent = readFileSync(bundlePath, 'utf8');
  const failures: string[] = [];

  if (inlineStylesSourcemapRegex.exec(bundleContent) !== null) {
    failures.push('Found sourcemap references in component styles.');
  }

  if (externalReferencesRegex.exec(bundleContent) !== null) {
    failures.push('Found external component resource references');
  }

  return failures;
}

/**
 * Checks a "package.json" file by ensuring that common fields which are
 * specified in the Angular package format are present. Those fields which
 * resolve to paths are checked so that they do not refer to non-existent files.
 */
export function checkPackageJsonFile(filePath: string): string[] {
  const fileContent = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(fileContent);
  const packageJsonDir = dirname(filePath);
  const failures: string[] = [];

  packageJsonPathFields.forEach(fieldName => {
    if (!parsed[fieldName]) {
      failures.push(`Missing field: ${fieldName}`);
    }

    const resolvedPath = join(packageJsonDir, parsed[fieldName]);

    if (!existsSync(resolvedPath)) {
      failures.push(`File referenced in "${fieldName}" field does not exist.`);
    }
  });

  return failures;
}

/**
 * Checks the specified TypeScript definition file by ensuring it does not contain invalid
 * dynamic import statements. There can be invalid type imports paths because we compose the
 * release package by moving things in a desired output structure. See Angular package format
 * specification and https://github.com/angular/components/pull/12876
 */
export function checkTypeDefinitionFile(filePath: string): string[] {
  const baseDir = dirname(filePath);
  const fileContent = readFileSync(filePath, 'utf8');
  const failures: string[] = [];

  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);
  const nodeQueue = [...sourceFile.getChildren()];

  while (nodeQueue.length) {
    const node = nodeQueue.shift()!;

    // Check all dynamic type imports and ensure that the import path is valid within the release
    // output. Note that we don't want to enforce that there are no dynamic type imports because
    // type inference is heavily used within the schematics and is useful in some situations.
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)) {
      const importPath = node.argument.literal.text;

      // In case the type import path starts with a dot, we know that this is a relative path
      // and can ensure that the target path exists. Note that we cannot completely rely on
      // "isAbsolute" because dynamic imports can also import from modules (e.g. "my-npm-module")
      if (importPath.startsWith('.') && !existsSync(join(baseDir, `${importPath}.d.ts`))) {
        failures.push('Found relative type imports which do not exist.');
      } else if (isAbsolute(importPath)) {
        failures.push('Found absolute type imports in definition file.');
      }
    }

    nodeQueue.push(...node.getChildren());
  }

  return failures;
}

/**
 * Checks the ng-update migration setup for the specified "package.json"
 * file if present.
 */
export function checkPackageJsonMigrations(
    packageJsonPath: string, currentVersion: Version): string[] {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (packageJson['ng-update'] && packageJson['ng-update'].migrations) {
    return checkMigrationCollection(
        packageJson['ng-update'].migrations, dirname(packageJsonPath), currentVersion);
  }
  return [];
}

/**
 * Checks the Angular Material release package and ensures that prebuilt themes
 * and the theming bundle are built properly.
 */
export function checkMaterialPackage(packagePath: string): string[] {
  const prebuiltThemesPath = join(packagePath, 'prebuilt-themes');
  const themingFilePath = join(packagePath, '_theming.scss');
  const failures: string[] = [];

  if (glob('*.css', {cwd: prebuiltThemesPath}).length === 0) {
    failures.push('No prebuilt themes could be found.');
  }

  if (!existsSync(themingFilePath)) {
    failures.push('The theming bundle could not be found.');
  }

  return failures;
}

/**
 * Checks whether the prebuilt CDK files are part of the release output.
 */
export function checkCdkPackage(packagePath: string): string[] {
  const prebuiltFiles = glob('*-prebuilt.css', {cwd: packagePath}).map(path => basename(path));
  return ['overlay', 'a11y', 'text-field']
      .filter(name => !prebuiltFiles.includes(`${name}-prebuilt.css`))
      .map(name => `Could not find the prebuilt ${name} styles.`);
}

/**
 * Checks if the migration collected referenced in the specified "package.json"
 * has a migration set up for the given target version.
 */
function checkMigrationCollection(
    collectionPath: string, packagePath: string, targetVersion: Version): string[] {
  const collection = JSON.parse(readFileSync(join(packagePath, collectionPath), 'utf8'));
  if (!collection.schematics) {
    return ['No schematics found in migration collection.'];
  }

  const failures: string[] = [];
  const lowerBoundaryVersion = `${targetVersion.major}.0.0-0`;
  const schematics = collection.schematics;
  const targetSchematics = Object.keys(schematics).filter(name => {
    const schematicVersion = schematics[name].version;
    try {
      return schematicVersion && semver.gte(schematicVersion, lowerBoundaryVersion) &&
          semver.lte(schematicVersion, targetVersion.format());
    } catch {
      failures.push(`Could not parse version for migration: ${name}`);
    }
  });

  if (targetSchematics.length === 0) {
    failures.push(`No migration configured that handles versions: ^${lowerBoundaryVersion}`);
  } else if (targetSchematics.length > 1) {
    failures.push(`Multiple migrations targeting the same major version: ${targetVersion.major}`);
  }
  return failures;
}
