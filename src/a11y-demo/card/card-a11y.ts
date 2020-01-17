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
  selector: 'card-a11y',
  templateUrl: 'card-a11y.html',
  styleUrls: ['card-a11y.css'],
})
export class CardAccessibilityDemo {
  showProgress: boolean = false;

  constructor(private _snackBar: MatSnackBar) {}

  openSnackbar(message: string) {
    this._snackBar.open(message, '', {duration: 2000});
  }
}
