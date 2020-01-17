/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ComponentHarness,
  HarnessPredicate,
  ComponentHarnessConstructor,
} from '@angular/cdk/testing';
import {CellHarnessFilters} from './table-harness-filters';

/** Harness for interacting with a standard Angular Material table cell. */
export class MatCellHarness extends ComponentHarness {
  /** The selector for the host element of a `MatCellHarness` instance. */
  static hostSelector = '.mat-cell';

  /**
   * Gets a `HarnessPredicate` that can be used to search for a table cell with specific attributes.
   * @param options Options for narrowing the search
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatCellHarness> {
    return getCellPredicate(MatCellHarness, options);
  }

  /** Gets the cell's text. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Gets the name of the column that the cell belongs to. */
  async getColumnName(): Promise<string> {
    const host = await this.host();
    const classAttribute = await host.getAttribute('class');

    if (classAttribute) {
      const prefix = 'mat-column-';
      const name = classAttribute.split(' ').map(c => c.trim()).find(c => c.startsWith(prefix));

      if (name) {
        return name.split(prefix)[1];
      }
    }

    throw Error('Could not determine column name of cell.');
  }
}

/** Harness for interacting with a standard Angular Material table header cell. */
export class MatHeaderCellHarness extends MatCellHarness {
  /** The selector for the host element of a `MatHeaderCellHarness` instance. */
  static hostSelector = '.mat-header-cell';

  /**
   * Gets a `HarnessPredicate` that can be used to search for
   * a table header cell with specific attributes.
   * @param options Options for narrowing the search
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatHeaderCellHarness> {
    return getCellPredicate(MatHeaderCellHarness, options);
  }
}

/** Harness for interacting with a standard Angular Material table footer cell. */
export class MatFooterCellHarness extends MatCellHarness {
  /** The selector for the host element of a `MatFooterCellHarness` instance. */
  static hostSelector = '.mat-footer-cell';

  /**
   * Gets a `HarnessPredicate` that can be used to search for
   * a table footer cell with specific attributes.
   * @param options Options for narrowing the search
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatFooterCellHarness> {
    return getCellPredicate(MatFooterCellHarness, options);
  }
}


function getCellPredicate<T extends MatCellHarness>(
  type: ComponentHarnessConstructor<T>,
  options: CellHarnessFilters): HarnessPredicate<T> {
  return new HarnessPredicate(type, options)
    .addOption('text', options.text,
        (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text));
}
