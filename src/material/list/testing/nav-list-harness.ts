/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {MatListHarnessBase} from './list-harness-base';
import {NavListHarnessFilters, NavListItemHarnessFilters} from './list-harness-filters';
import {getListItemPredicate, MatListItemHarnessBase} from './list-item-harness-base';

/** Harness for interacting with a standard mat-nav-list in tests. */
export class MatNavListHarness extends MatListHarnessBase<
    typeof MatNavListItemHarness, MatNavListItemHarness, NavListItemHarnessFilters> {
  /** The selector for the host element of a `MatNavList` instance. */
  static hostSelector = 'mat-nav-list';

  /**
   * Gets a `HarnessPredicate` that can be used to search for a `MatNavListHarness` that meets
   * certain criteria.
   * @param options Options for filtering which nav list instances are considered a match.
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: NavListHarnessFilters = {}): HarnessPredicate<MatNavListHarness> {
    return new HarnessPredicate(MatNavListHarness, options);
  }

  _itemHarness = MatNavListItemHarness;
}

/** Harness for interacting with a nav list item. */
export class MatNavListItemHarness extends MatListItemHarnessBase {
  /** The selector for the host element of a `MatListItem` instance. */
  static hostSelector = ['mat-list-item', 'a[mat-list-item]', 'button[mat-list-item]']
      .map(selector => `${MatNavListHarness.hostSelector} ${selector}`)
      .join(',');

  /**
   * Gets a `HarnessPredicate` that can be used to search for a `MatNavListItemHarness` that
   * meets certain criteria.
   * @param options Options for filtering which nav list item instances are considered a match.
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: NavListItemHarnessFilters = {}): HarnessPredicate<MatNavListItemHarness> {
    return getListItemPredicate(MatNavListItemHarness, options)
        .addOption('href', options.href,
            async (harness, href) => HarnessPredicate.stringMatches(harness.getHref(), href));
  }

  /** Gets the href for this nav list item. */
  async getHref(): Promise<string | null> {
    return (await this.host()).getAttribute('href');
  }

  /** Clicks on the nav list item. */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /** Focuses the nav list item. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Blurs the nav list item. */
  async blur(): Promise<void> {
    return (await this.host()).blur();
  }
}
