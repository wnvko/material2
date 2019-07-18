/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import {ResolvedResource} from '../../update-tool/component-resource-collector';
import {MigrationRule} from '../../update-tool/migration-rule';
import {ElementSelectorUpgradeData} from '../data/element-selectors';
import {findAllSubstringIndices} from '../typescript/literal';
import {getVersionUpgradeData, RuleUpgradeData} from '../upgrade-data';

/**
 * Rule that walks through every string literal, template and stylesheet in order
 * to migrate outdated element selectors to the new one.
 */
export class ElementSelectorsRule extends MigrationRule<RuleUpgradeData> {
  /** Change data that upgrades to the specified target version. */
  data = getVersionUpgradeData(this, 'elementSelectors');

  // Only enable the migration rule if there is upgrade data.
  ruleEnabled = this.data.length !== 0;

  visitNode(node: ts.Node): void {
    if (ts.isStringLiteralLike(node)) {
      this._visitStringLiteralLike(node);
    }
  }

  visitTemplate(template: ResolvedResource): void {
    this.data.forEach(selector => {
      findAllSubstringIndices(template.content, selector.replace)
          .map(offset => template.start + offset)
          .forEach(start => this._replaceSelector(template.filePath, start, selector));
    });
  }

  visitStylesheet(stylesheet: ResolvedResource): void {
    this.data.forEach(selector => {
      findAllSubstringIndices(stylesheet.content, selector.replace)
          .map(offset => stylesheet.start + offset)
          .forEach(start => this._replaceSelector(stylesheet.filePath, start, selector));
    });
  }

  private _visitStringLiteralLike(node: ts.StringLiteralLike) {
    if (node.parent && node.parent.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }

    const textContent = node.getText();
    const filePath = node.getSourceFile().fileName;

    this.data.forEach(selector => {
      findAllSubstringIndices(textContent, selector.replace)
          .map(offset => node.getStart() + offset)
          .forEach(start => this._replaceSelector(filePath, start, selector));
    });
  }

  private _replaceSelector(filePath: string, start: number, data: ElementSelectorUpgradeData) {
    const updateRecorder = this.getUpdateRecorder(filePath);
    updateRecorder.remove(start, data.replace.length);
    updateRecorder.insertRight(start, data.replaceWith);
  }
}
