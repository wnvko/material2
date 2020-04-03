/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directionality} from '@angular/cdk/bidi';
import {coerceNumberProperty, NumberInput} from '@angular/cdk/coercion';
import {Directive, ElementRef, Input, OnDestroy, Optional, Renderer2} from '@angular/core';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {CdkTree, CdkTreeNode} from './tree';

/** Regex used to split a string on its CSS units. */
const cssUnitPattern = /([A-Za-z%]+)$/;

/**
 * Indent for the children tree dataNodes.
 * This directive will add left-padding to the node to show hierarchy.
 */
@Directive({
  selector: '[cdkTreeNodePadding]',
})
export class CdkTreeNodePadding<T> implements OnDestroy {
  /** Current padding value applied to the element. Used to avoid unnecessarily hitting the DOM. */
  private _currentPadding: string|null;

  /** Subject that emits when the component has been destroyed. */
  private _destroyed = new Subject<void>();

  /** CSS units used for the indentation value. */
  indentUnits = 'px';

  /** The level of depth of the tree node. The padding will be `level * indent` pixels. */
  @Input('cdkTreeNodePadding')
  get level(): number { return this._level; }
  set level(value: number) {
    // Set to null as the fallback value so that _setPadding can fall back to the node level if the
    // consumer set the directive as `cdkTreeNodePadding=""`. We still want to take this value if
    // they set 0 explicitly.
    this._level = coerceNumberProperty(value, null)!;
    this._setPadding();
  }
  _level: number;

  /**
   * The indent for each level. Can be a number or a CSS string.
   * Default number 40px from material design menu sub-menu spec.
   */
  @Input('cdkTreeNodePaddingIndent')
  get indent(): number | string { return this._indent; }
  set indent(indent: number | string) {
    let value = indent;
    let units = 'px';

    if (typeof indent === 'string') {
      const parts = indent.split(cssUnitPattern);
      value = parts[0];
      units = parts[1] || units;
    }

    this.indentUnits = units;
    this._indent = coerceNumberProperty(value);
    this._setPadding();
  }
  _indent: number = 40;

  constructor(private _treeNode: CdkTreeNode<T>,
              private _tree: CdkTree<T>,
              /**
               * @deprecated _renderer parameter no longer being used. To be removed.
               * @breaking-change 11.0.0
               */
              _renderer: Renderer2,
              private _element: ElementRef<HTMLElement>,
              @Optional() private _dir: Directionality) {
    this._setPadding();
    if (_dir) {
      _dir.change.pipe(takeUntil(this._destroyed)).subscribe(() => this._setPadding(true));
    }

    // In Ivy the indentation binding might be set before the tree node's data has been added,
    // which means that we'll miss the first render. We have to subscribe to changes in the
    // data to ensure that everything is up to date.
    _treeNode._dataChanges.subscribe(() => this._setPadding());
  }

  ngOnDestroy() {
    this._destroyed.next();
    this._destroyed.complete();
  }

  /** The padding indent value for the tree node. Returns a string with px numbers if not null. */
  _paddingIndent(): string|null {
    const nodeLevel = (this._treeNode.data && this._tree.treeControl.getLevel)
      ? this._tree.treeControl.getLevel(this._treeNode.data)
      : null;
    const level = this._level == null ? nodeLevel : this._level;
    return typeof level === 'number' ? `${level * this._indent}${this.indentUnits}` : null;
  }

  _setPadding(forceChange = false) {
    const padding = this._paddingIndent();

    if (padding !== this._currentPadding || forceChange) {
      const element = this._element.nativeElement;
      const paddingProp = this._dir && this._dir.value === 'rtl' ? 'paddingRight' : 'paddingLeft';
      const resetProp = paddingProp === 'paddingLeft' ? 'paddingRight' : 'paddingLeft';
      element.style[paddingProp] = padding || '';
      element.style[resetProp] = '';
      this._currentPadding = padding;
    }
  }

  static ngAcceptInputType_level: NumberInput;
}
