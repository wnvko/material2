/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {dirname} from 'path';
import * as ts from 'typescript';

import {ComponentResourceCollector} from './component-resource-collector';
import {FileSystem} from './file-system';
import {defaultLogger, UpdateLogger} from './logger';
import {Migration, MigrationCtor, MigrationFailure} from './migration';
import {TargetVersion} from './target-version';
import {parseTsconfigFile} from './utils/parse-tsconfig';

/**
 * An update project that can be run against individual migrations. An update project
 * accepts a TypeScript program and a context that is provided to all migrations. The
 * context is usually not used by migrations, but in some cases migrations rely on
 * specifics from the tool that performs the update (e.g. the Angular CLI). In those cases,
 * the context can provide the necessary specifics to the migrations in a type-safe way.
 */
export class UpdateProject<Context> {
  private readonly _typeChecker: ts.TypeChecker = this._program.getTypeChecker();

  constructor(private _context: Context,
              private _program: ts.Program,
              private _fileSystem: FileSystem,
              private _analyzedFiles: Set<string> = new Set(),
              private _logger: UpdateLogger = defaultLogger) {}

  /**
   * Migrates the project to the specified target version.
   * @param migrationTypes Migrations that should be run.
   * @param target Version the project should be updated to.
   * @param data Upgrade data that is passed to all migration rules.
   * @param additionalStylesheetPaths Additional stylesheets that should be migrated, if not
   *   referenced in an Angular component. This is helpful for global stylesheets in a project.
   */
  migrate<Data>(migrationTypes: MigrationCtor<Data, Context>[], target: TargetVersion, data: Data,
      additionalStylesheetPaths?: string[]): {hasFailures: boolean} {
    // Create instances of the specified migrations.
    const migrations = this._createMigrations(migrationTypes, target, data);
    // Creates the component resource collector. The collector can visit arbitrary
    // TypeScript nodes and will find Angular component resources. Resources include
    // templates and stylesheets. It also captures inline stylesheets and templates.
    const resourceCollector = new ComponentResourceCollector(this._typeChecker, this._fileSystem);
    // Collect all of the TypeScript source files we want to migrate. We don't
    // migrate type definition files, or source files from external libraries.
    const sourceFiles = this._program.getSourceFiles().filter(
      f => !f.isDeclarationFile && !this._program.isSourceFileFromExternalLibrary(f));

    // Helper function that visits a given TypeScript node and collects all referenced
    // component resources (i.e. stylesheets or templates). Additionally, the helper
    // visits the node in each instantiated migration.
    const visitNodeAndCollectResources = (node: ts.Node) => {
      migrations.forEach(r => r.visitNode(node));
      ts.forEachChild(node, visitNodeAndCollectResources);
      resourceCollector.visitNode(node);
    };

    // Walk through all source file, if it has not been visited before, and
    // visit found nodes while collecting potential resources.
    sourceFiles.forEach(sourceFile => {
      const resolvedPath = this._fileSystem.resolve(sourceFile.fileName);
      // Do not visit source files which have been checked as part of a
      // previously migrated TypeScript project.
      if (!this._analyzedFiles.has(resolvedPath)) {
        visitNodeAndCollectResources(sourceFile);
        this._analyzedFiles.add(resolvedPath);
      }
    });

    // Walk through all resolved templates and visit them in each instantiated
    // migration. Note that this can only happen after source files have been
    // visited because we find templates through the TypeScript source files.
    resourceCollector.resolvedTemplates.forEach(template => {
      const resolvedPath = this._fileSystem.resolve(template.filePath);
      // Do not visit the template if it has been checked before. Inline
      // templates cannot be referenced multiple times.
      if (template.inline || !this._analyzedFiles.has(resolvedPath)) {
        migrations.forEach(m => m.visitTemplate(template));
        this._analyzedFiles.add(resolvedPath);
      }
    });

    // Walk through all resolved stylesheets and visit them in each instantiated
    // migration. Note that this can only happen after source files have been
    // visited because we find stylesheets through the TypeScript source files.
    resourceCollector.resolvedStylesheets.forEach(stylesheet => {
      const resolvedPath = this._fileSystem.resolve(stylesheet.filePath);
      // Do not visit the stylesheet if it has been checked before. Inline
      // stylesheets cannot be referenced multiple times.
      if (stylesheet.inline || !this._analyzedFiles.has(resolvedPath)) {
        migrations.forEach(r => r.visitStylesheet(stylesheet));
        this._analyzedFiles.add(resolvedPath);
      }
    });

    // In some applications, developers will have global stylesheets which are not
    // specified in any Angular component. Therefore we allow for additional stylesheets
    // being specified. We visit them in each migration unless they have been already
    // discovered before as actual component resource.
    additionalStylesheetPaths.forEach(filePath => {
      const stylesheet = resourceCollector.resolveExternalStylesheet(filePath, null);
      const resolvedPath = this._fileSystem.resolve(filePath);
      // Do not visit stylesheets which have been referenced from a component.
      if (!this._analyzedFiles.has(resolvedPath)) {
        migrations.forEach(r => r.visitStylesheet(stylesheet));
        this._analyzedFiles.add(resolvedPath);
      }
    });

    // Call the "postAnalysis" method for each migration.
    migrations.forEach(r => r.postAnalysis());

    // Collect all failures reported by individual migrations.
    const failures = migrations.reduce((res, m) =>
        res.concat(m.failures), [] as MigrationFailure[]);

    // In case there are failures, print these to the CLI logger as warnings.
    if (failures.length) {
      failures.forEach(({filePath, message, position}) => {
        const posixFilePath = this._fileSystem.resolve(filePath).replace(/\\/g, '/');
        const lineAndCharacter = position ? `@${position.line + 1}:${position.character + 1}` : '';
        this._logger.warn(`${posixFilePath}${lineAndCharacter} - ${message}`);
      });
    }

    return {
      hasFailures: !!failures.length,
    };
  }

  /**
   * Creates instances of the given migrations with the specified target
   * version and data.
   */
  private _createMigrations<Data>(types: MigrationCtor<Data, Context>[], target: TargetVersion,
                                  data: Data): Migration<Data, Context>[] {
    const result: Migration<Data, Context>[] = [];
    for (const ctor of types) {
      const instance = new ctor(this._program, this._typeChecker, target, this._context,
        data, this._fileSystem, this._logger);
      instance.init();
      if (instance.enabled) {
        result.push(instance);
      }
    }
    return result;
  }

  /**
   * Creates a program form the specified tsconfig and patches the host
   * to read files through the given file system.
   */
  static createProgramFromTsconfig(tsconfigFsPath: string, fs: FileSystem): ts.Program {
    const parsed = parseTsconfigFile(tsconfigFsPath, dirname(tsconfigFsPath));
    const host = ts.createCompilerHost(parsed.options, true);
    // Patch the host to read files through the specified file system.
    host.readFile = fileName => {
      const fileContent = fs.read(fileName);
      // Strip BOM as otherwise TSC methods (e.g. "getWidth") will return an offset which
      // which breaks the CLI UpdateRecorder. https://github.com/angular/angular/pull/30719
      return fileContent !== null ? fileContent.replace(/^\uFEFF/, '') : undefined;
    };
    return ts.createProgram(parsed.fileNames, parsed.options, host);
  }
}
