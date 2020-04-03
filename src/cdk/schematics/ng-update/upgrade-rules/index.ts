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

import {MigrationRuleType, runMigrationRules} from '../../update-tool';
import {TargetVersion} from '../../update-tool/target-version';
import {
  getTargetTsconfigPath,
  getWorkspaceConfigGracefully
} from '../../utils/project-tsconfig-paths';
import {RuleUpgradeData} from '../upgrade-data';

import {AttributeSelectorsRule} from './attribute-selectors-rule';
import {ClassInheritanceRule} from './class-inheritance-rule';
import {ClassNamesRule} from './class-names-rule';
import {ConstructorSignatureRule} from './constructor-signature-rule';
import {CssSelectorsRule} from './css-selectors-rule';
import {ElementSelectorsRule} from './element-selectors-rule';
import {InputNamesRule} from './input-names-rule';
import {MethodCallArgumentsRule} from './method-call-arguments-rule';
import {MiscTemplateRule} from './misc-template-rule';
import {OutputNamesRule} from './output-names-rule';
import {PropertyNamesRule} from './property-names-rule';


/** List of migration rules which run for the CDK update. */
export const cdkMigrationRules: MigrationRuleType<RuleUpgradeData>[] = [
  AttributeSelectorsRule,
  ClassInheritanceRule,
  ClassNamesRule,
  ConstructorSignatureRule,
  CssSelectorsRule,
  ElementSelectorsRule,
  InputNamesRule,
  MethodCallArgumentsRule,
  MiscTemplateRule,
  OutputNamesRule,
  PropertyNamesRule,
];

type NullableMigrationRule = MigrationRuleType<RuleUpgradeData|null>;

type PostMigrationFn =
    (context: SchematicContext, targetVersion: TargetVersion, hasFailure: boolean) => void;

/**
 * Creates a Angular schematic rule that runs the upgrade for the
 * specified target version.
 */
export function createUpgradeRule(
    targetVersion: TargetVersion, extraRules: NullableMigrationRule[], upgradeData: RuleUpgradeData,
    onMigrationCompleteFn?: PostMigrationFn): Rule {
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
    const projectNames = Object.keys(workspace.projects);
    const rules = [...cdkMigrationRules, ...extraRules];
    let hasRuleFailures = false;

    const runMigration =
        (project: WorkspaceProject, tsconfigPath: string, isTestTarget: boolean) => {
          const result = runMigrationRules(
              project, tree, context.logger, tsconfigPath, isTestTarget, targetVersion, rules,
              upgradeData, analyzedFiles);
          hasRuleFailures = hasRuleFailures || result.hasFailures;
        };

    for (const projectName of projectNames) {
      const project = workspace.projects[projectName];
      const buildTsconfigPath = getTargetTsconfigPath(project, 'build');
      const testTsconfigPath = getTargetTsconfigPath(project, 'test');

      if (!buildTsconfigPath && !testTsconfigPath) {
        logger.warn(`Could not find TypeScript project for project: ${projectName}`);
        continue;
      }
      if (buildTsconfigPath !== null) {
        runMigration(project, buildTsconfigPath, false);
      }
      if (testTsconfigPath !== null) {
        runMigration(project, testTsconfigPath, true);
      }
    }

    let runPackageManager = false;
    // Run the global post migration static members for all migration rules.
    rules.forEach(rule => {
      const actionResult = rule.globalPostMigration(tree, context);
      if (actionResult) {
        runPackageManager = runPackageManager || actionResult.runPackageManager;
      }
    });

    // If a rule requested the package manager to run, we run it as an
    // asynchronous post migration task. We cannot run it synchronously,
    // as file changes from the current migration task are not applied to
    // the file system yet.
    if (runPackageManager) {
      context.addTask(new NodePackageInstallTask({quiet: false}));
    }

    if (onMigrationCompleteFn) {
      onMigrationCompleteFn(context, targetVersion, hasRuleFailures);
    }
  };
}
