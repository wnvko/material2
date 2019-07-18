/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';


@Component({
  moduleId: module.id,
  selector: 'icon-a11y',
  templateUrl: 'icon-a11y.html',
})
export class IconAccessibilityDemo {
  constructor(private _snackBar: MatSnackBar) {}

  deleteIcon() {
    this._snackBar.open('Item deleted', '', {duration: 2000});
  }
}
