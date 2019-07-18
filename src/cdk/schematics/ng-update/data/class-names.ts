/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {TargetVersion} from '../../update-tool/target-version';
import {VersionChanges} from '../../update-tool/version-changes';

export interface ClassNameUpgradeData {
  /** The Class name to replace. */
  replace: string;
  /** The new name for the Class. */
  replaceWith: string;
}

export const classNames: VersionChanges<ClassNameUpgradeData> = {
  [TargetVersion.V6]: [
    {
      pr: 'https://github.com/angular/components/pull/10161',
      changes: [
        {replace: 'ConnectedOverlayDirective', replaceWith: 'CdkConnectedOverlay'},
        {replace: 'OverlayOrigin', replaceWith: 'CdkOverlayOrigin'}
      ]
    },

    {
      pr: 'https://github.com/angular/components/pull/10267',
      changes: [{replace: 'ObserveContent', replaceWith: 'CdkObserveContent'}]
    },

    {
      pr: 'https://github.com/angular/components/pull/10325',
      changes: [{replace: 'FocusTrapDirective', replaceWith: 'CdkTrapFocus'}]
    }
  ]
};
