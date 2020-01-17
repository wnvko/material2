/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component} from '@angular/core';

@Component({
  selector: 'button-toggle-demo',
  template: `<example-list-viewer [ids]="examples"></example-list-viewer>`,
})
export class ButtonToggleE2e {
  examples = ['button-toggle-overview'];
}
