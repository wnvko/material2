/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HighContrastModeDetector} from '@angular/cdk/a11y';
import {BidiModule} from '@angular/cdk/bidi';
import {Inject, InjectionToken, isDevMode, NgModule, Optional, Version} from '@angular/core';
import {VERSION as CDK_VERSION} from '@angular/cdk';
import {DOCUMENT} from '@angular/common';

// Private version constant to circumvent test/build issues,
// i.e. avoid core to depend on the @angular/material primary entry-point
// Can be removed once the Material primary entry-point no longer
// re-exports all secondary entry-points
const VERSION = new Version('0.0.0-PLACEHOLDER');

/** @docs-private */
export function MATERIAL_SANITY_CHECKS_FACTORY(): SanityChecks {
  return true;
}

/** Injection token that configures whether the Material sanity checks are enabled. */
export const MATERIAL_SANITY_CHECKS = new InjectionToken<SanityChecks>('mat-sanity-checks', {
  providedIn: 'root',
  factory: MATERIAL_SANITY_CHECKS_FACTORY,
});

/**
 * Possible sanity checks that can be enabled. If set to
 * true/false, all checks will be enabled/disabled.
 */
export type SanityChecks = boolean | GranularSanityChecks;

/** Object that can be used to configure the sanity checks granularly. */
export interface GranularSanityChecks {
  doctype: boolean;
  theme: boolean;
  version: boolean;

  /**
   * @deprecated No longer being used.
   * @breaking-change 10.0.0
   */
  hammer: boolean;
}

/**
 * Module that captures anything that should be loaded and/or run for *all* Angular Material
 * components. This includes Bidi, etc.
 *
 * This module should be imported to each top-level component module (e.g., MatTabsModule).
 */
@NgModule({
  imports: [BidiModule],
  exports: [BidiModule],
})
export class MatCommonModule {
  /** Whether we've done the global sanity checks (e.g. a theme is loaded, there is a doctype). */
  private _hasDoneGlobalChecks = false;

  /** Configured sanity checks. */
  private _sanityChecks: SanityChecks;

  /** Used to reference correct document/window */
  protected _document?: Document;

  constructor(
      highContrastModeDetector: HighContrastModeDetector,
      @Optional() @Inject(MATERIAL_SANITY_CHECKS) sanityChecks: any,
      /** @breaking-change 11.0.0 make document required */
      @Optional() @Inject(DOCUMENT) document?: any) {
    this._document = document;

    // While A11yModule also does this, we repeat it here to avoid importing A11yModule
    // in MatCommonModule.
    highContrastModeDetector._applyBodyHighContrastModeCssClasses();

    // Note that `_sanityChecks` is typed to `any`, because AoT
    // throws an error if we use the `SanityChecks` type directly.
    this._sanityChecks = sanityChecks;

    if (!this._hasDoneGlobalChecks) {
      this._checkDoctypeIsDefined();
      this._checkThemeIsPresent();
      this._checkCdkVersionMatch();
      this._hasDoneGlobalChecks = true;
    }
  }

    /** Access injected document if available or fallback to global document reference */
    private _getDocument(): Document | null {
      const doc = this._document || document;
      return typeof doc === 'object' && doc ? doc : null;
    }

    /** Use defaultView of injected document if available or fallback to global window reference */
    private _getWindow(): Window | null {
      const doc = this._getDocument();
      const win = doc?.defaultView || window;
      return typeof win === 'object' && win ? win : null;
    }

  /** Whether any sanity checks are enabled. */
  private _checksAreEnabled(): boolean {
    return isDevMode() && !this._isTestEnv();
  }

  /** Whether the code is running in tests. */
  private _isTestEnv() {
    const window = this._getWindow() as any;
    return window && (window.__karma__ || window.jasmine);
  }

  private _checkDoctypeIsDefined(): void {
    const isEnabled = this._checksAreEnabled() &&
      (this._sanityChecks === true || (this._sanityChecks as GranularSanityChecks).doctype);
    const document = this._getDocument();

    if (isEnabled && document && !document.doctype) {
      console.warn(
        'Current document does not have a doctype. This may cause ' +
        'some Angular Material components not to behave as expected.'
      );
    }
  }

  private _checkThemeIsPresent(): void {
    // We need to assert that the `body` is defined, because these checks run very early
    // and the `body` won't be defined if the consumer put their scripts in the `head`.
    const isDisabled = !this._checksAreEnabled() ||
      (this._sanityChecks === false || !(this._sanityChecks as GranularSanityChecks).theme);
    const document = this._getDocument();

    if (isDisabled || !document || !document.body ||
        typeof getComputedStyle !== 'function') {
      return;
    }

    const testElement = document.createElement('div');

    testElement.classList.add('mat-theme-loaded-marker');
    document.body.appendChild(testElement);

    const computedStyle = getComputedStyle(testElement);

    // In some situations the computed style of the test element can be null. For example in
    // Firefox, the computed style is null if an application is running inside of a hidden iframe.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=548397
    if (computedStyle && computedStyle.display !== 'none') {
      console.warn(
        'Could not find Angular Material core theme. Most Material ' +
        'components may not work as expected. For more info refer ' +
        'to the theming guide: https://material.angular.io/guide/theming'
      );
    }

    document.body.removeChild(testElement);
  }

  /** Checks whether the material version matches the cdk version */
  private _checkCdkVersionMatch(): void {
    const isEnabled = this._checksAreEnabled() &&
      (this._sanityChecks === true || (this._sanityChecks as GranularSanityChecks).version);

    if (isEnabled && VERSION.full !== CDK_VERSION.full) {
      console.warn(
          'The Angular Material version (' + VERSION.full + ') does not match ' +
          'the Angular CDK version (' + CDK_VERSION.full + ').\n' +
          'Please ensure the versions of these two packages exactly match.'
      );
    }
  }
}
