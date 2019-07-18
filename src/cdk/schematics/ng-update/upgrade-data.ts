/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {MigrationRule} from '../update-tool/migration-rule';
import {getChangesForTarget, ValueOfChanges, VersionChanges} from '../update-tool/version-changes';
import {
  attributeSelectors,
  AttributeSelectorUpgradeData,
  classNames,
  ClassNameUpgradeData,
  constructorChecks,
  ConstructorChecksUpgradeData,
  cssSelectors,
  CssSelectorUpgradeData,
  elementSelectors,
  ElementSelectorUpgradeData,
  inputNames,
  InputNameUpgradeData,
  methodCallChecks,
  MethodCallUpgradeData,
  outputNames,
  OutputNameUpgradeData,
  propertyNames,
  PropertyNameUpgradeData,
} from './data';


/** Upgrade data for the Angular CDK. */
export const cdkUpgradeData: RuleUpgradeData = {
  attributeSelectors,
  classNames,
  constructorChecks,
  cssSelectors,
  elementSelectors,
  inputNames,
  methodCallChecks,
  outputNames,
  propertyNames,
};

/**
 * Interface that describes the upgrade data that needs to be defined when using the CDK
 * upgrade rules.
 */
export interface RuleUpgradeData {
  attributeSelectors: VersionChanges<AttributeSelectorUpgradeData>;
  classNames: VersionChanges<ClassNameUpgradeData>;
  constructorChecks: VersionChanges<ConstructorChecksUpgradeData>;
  cssSelectors: VersionChanges<CssSelectorUpgradeData>;
  elementSelectors: VersionChanges<ElementSelectorUpgradeData>;
  inputNames: VersionChanges<InputNameUpgradeData>;
  methodCallChecks: VersionChanges<MethodCallUpgradeData>;
  outputNames: VersionChanges<OutputNameUpgradeData>;
  propertyNames: VersionChanges<PropertyNameUpgradeData>;
}

/**
 * Gets the reduced upgrade data for the specified data key from the rule walker options.
 *
 * The function reads out the target version and upgrade data object from the rule options and
 * resolves the specified data portion that is specifically tied to the target version.
 */
export function
getVersionUpgradeData<T extends keyof RuleUpgradeData, U = ValueOfChanges<RuleUpgradeData[T]>>(
    r: MigrationRule<RuleUpgradeData>, dataName: T): U[] {
  return getChangesForTarget<U>(r.targetVersion, r.upgradeData[dataName] as VersionChanges<U>);
}
