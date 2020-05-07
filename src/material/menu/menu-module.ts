/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCommonModule, MatRippleModule} from '@angular/material/core';
import {CdkScrollableModule} from '@angular/cdk/scrolling';
import {_MatMenu} from './menu';
import {MatMenuContent} from './menu-content';
import {MatMenuItem} from './menu-item';
import {MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER, MatMenuTrigger} from './menu-trigger';

/**
 * Used by both the current `MatMenuModule` and the MDC `MatMenuModule`
 * to declare the menu-related directives.
 */
@NgModule({
  exports: [MatMenuTrigger, MatMenuContent, MatCommonModule],
  declarations: [
    MatMenuTrigger,
    MatMenuContent,
  ],
  providers: [MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER]
})
// tslint:disable-next-line:class-name
export class _MatMenuDirectivesModule {}

@NgModule({
  imports: [
    CommonModule,
    MatCommonModule,
    MatRippleModule,
    OverlayModule,
    _MatMenuDirectivesModule,
  ],
  exports: [CdkScrollableModule, MatCommonModule, _MatMenu, MatMenuItem, _MatMenuDirectivesModule],
  declarations: [_MatMenu, MatMenuItem],
  providers: [MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER]
})
export class MatMenuModule {}
