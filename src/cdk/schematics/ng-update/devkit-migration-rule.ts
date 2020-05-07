/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Rule, SchematicContext, Tree} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {WorkspaceProject} from '@schematics/angular/utility/workspace-models';
import {sync as globSync} from 'glob';
import {join} from 'path';

import {UpdateProject} from '../update-tool';
import {MigrationCtor} from '../update-tool/migration';
import {TargetVersion} from '../update-tool/target-version';
import {getTargetTsconfigPath, getWorkspaceConfigGracefully} from '../utils/project-tsconfig-paths';

import {DevkitFileSystem} from './devkit-file-system';
import {DevkitContext, DevkitMigration, DevkitMigrationCtor} from './devkit-migration';
import {AttributeSelectorsMigration} from './migrations/attribute-selectors';
import {ClassInheritanceMigration} from './migrations/class-inheritance';
import {ClassNamesMigration} from './migrations/class-names';
import {ConstructorSignatureMigration} from './migrations/constructor-signature';
import {CssSelectorsMigration} from './migrations/css-selectors';
import {ElementSelectorsMigration} from './migrations/element-selectors';
import {InputNamesMigration} from './migrations/input-names';
import {MethodCallArgumentsMigration} from './migrations/method-call-arguments';
import {MiscTemplateMigration} from './migrations/misc-template';
import {OutputNamesMigration} from './migrations/output-names';
import {PropertyNamesMigration} from './migrations/property-names';
import {UpgradeData} from './upgrade-data';


/** List of migrations which run for the CDK update. */
export const cdkMigrations: MigrationCtor<UpgradeData>[] = [
  AttributeSelectorsMigration,
  ClassInheritanceMigration,
  ClassNamesMigration,
  ConstructorSignatureMigration,
  CssSelectorsMigration,
  ElementSelectorsMigration,
  InputNamesMigration,
  MethodCallArgumentsMigration,
  MiscTemplateMigration,
  OutputNamesMigration,
  PropertyNamesMigration,
];

export type NullableDevkitMigration = MigrationCtor<UpgradeData|null, DevkitContext>;

type PostMigrationFn =
    (context: SchematicContext, targetVersion: TargetVersion, hasFailure: boolean) => void;

/**
 * Creates a Angular schematic rule that runs the upgrade for the
 * specified target version.
 */
export function createMigrationSchematicRule(
    targetVersion: TargetVersion, extraMigrations: NullableDevkitMigration[],
    upgradeData: UpgradeData, onMigrationCompleteFn?: PostMigrationFn): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const logger = context.logger;
    const workspace = getWorkspaceConfigGracefully(tree);

    if (workspace === null) {
      logger.error('Could not find workspace configuration file.');
      return;
    }

    // Keep track of all project source files which have been checked/migrated. This is
    // necessary because multiple TypeScript projects can contain the same source file and
    // we don't want to check these again, as this would result in duplicated failure messages.
    const analyzedFiles = new Set<string>();
    // The CLI uses the working directory as the base directory for the virtual file system tree.
    const workspaceFsPath = process.cwd();
    const fileSystem = new DevkitFileSystem(tree, workspaceFsPath);
    const projectNames = Object.keys(workspace.projects);
    const migrations: NullableDevkitMigration[] = [...cdkMigrations, ...extraMigrations];
    let hasFailures = false;

    for (const projectName of projectNames) {
      const project = workspace.projects[projectName];
      const buildTsconfigPath = getTargetTsconfigPath(project, 'build');
      const testTsconfigPath = getTargetTsconfigPath(project, 'test');

      if (!buildTsconfigPath && !testTsconfigPath) {
        logger.warn(`Could not find TypeScript project for project: ${projectName}`);
        continue;
      }
      if (buildTsconfigPath !== null) {
        runMigrations(project, projectName, buildTsconfigPath, false);
      }
      if (testTsconfigPath !== null) {
        runMigrations(project, projectName, testTsconfigPath, true);
      }
    }

    let runPackageManager = false;
    // Run the global post migration static members for all
    // registered devkit migrations.
    migrations.forEach(m => {
      const actionResult = isDevkitMigration(m) && m.globalPostMigration !== undefined ?
          m.globalPostMigration(tree, context) : null;
      if (actionResult) {
        runPackageManager = runPackageManager || actionResult.runPackageManager;
      }
    });

    // If a migration requested the package manager to run, we run it as an
    // asynchronous post migration task. We cannot run it synchronously,
    // as file changes from the current migration task are not applied to
    // the file system yet.
    if (runPackageManager) {
      context.addTask(new NodePackageInstallTask({quiet: false}));
    }

    if (onMigrationCompleteFn) {
      onMigrationCompleteFn(context, targetVersion, hasFailures);
    }

    /** Runs the migrations for the specified workspace project. */
    function runMigrations(project: WorkspaceProject, projectName: string,
                           tsconfigPath: string, isTestTarget: boolean) {
      const projectRootFsPath = join(workspaceFsPath, project.root);
      const tsconfigFsPath = join(workspaceFsPath, tsconfigPath);
      const program = UpdateProject.createProgramFromTsconfig(tsconfigFsPath, fileSystem);
      const updateContext: DevkitContext = {
        workspaceFsPath,
        isTestTarget,
        projectName,
        project,
        tree,
      };

      const updateProject = new UpdateProject(
        updateContext,
        program,
        fileSystem,
        analyzedFiles,
        context.logger,
      );

      // In some applications, developers will have global stylesheets which are not
      // specified in any Angular component. Therefore we glob up all CSS and SCSS files
      // outside of node_modules and dist. The files will be read by the individual
      // stylesheet rules and checked.
      // TODO: rework this to collect global stylesheets from the workspace config. COMP-280.
      const additionalStylesheets = globSync(
        '!(node_modules|dist)/**/*.+(css|scss)',
        {absolute: true, cwd: projectRootFsPath, nodir: true});

      const result =
        updateProject.migrate(migrations, targetVersion, upgradeData, additionalStylesheets);

      // Commit all recorded edits in the update recorder. We apply the edits after all
      // migrations ran because otherwise offsets in the TypeScript program would be
      // shifted and individual migrations could no longer update the same source file.
      fileSystem.commitEdits();

      hasFailures = hasFailures || result.hasFailures;
    }
  };
}

/** Whether the given migration type refers to a devkit migration */
export function isDevkitMigration(value: MigrationCtor<any, any>)
    : value is DevkitMigrationCtor<any> {
  return DevkitMigration.isPrototypeOf(value);
}
