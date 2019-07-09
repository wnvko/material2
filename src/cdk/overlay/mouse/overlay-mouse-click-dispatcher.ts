/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {DOCUMENT} from '@angular/common';
import {
  Inject,
  Injectable,
  OnDestroy,
} from '@angular/core';
  import {OverlayRef} from '../overlay-ref';

/**
 * Service for dispatching mouse click events that land on the body to appropriate overlay ref,
 * if any. It maintains a list of attached overlays to determine best suited overlay based
 * on event target and order of overlay opens.
 */
@Injectable({providedIn: 'root'})
export class OverlayMouseClickDispatcher implements OnDestroy {

  /** Currently attached overlays in the order they were attached. */
  _attachedOverlays: OverlayRef[] = [];

  private _document: Document;
  private _isAttached: boolean;

  constructor(@Inject(DOCUMENT) document: any) {
    this._document = document;
  }

  ngOnDestroy() {
    this._detach();
  }

  /** Add a new overlay to the list of attached overlay refs. */
  add(overlayRef: OverlayRef): void {
    // Ensure that we don't get the same overlay multiple times.
    this.remove(overlayRef);

    // Lazily start dispatcher once first overlay is added
    if (!this._isAttached) {
      this._document.body.addEventListener('click', this._clickListener, true);
      this._isAttached = true;
    }

    this._attachedOverlays.push(overlayRef);
  }

  /** Remove an overlay from the list of attached overlay refs. */
  remove(overlayRef: OverlayRef): void {
    const index = this._attachedOverlays.indexOf(overlayRef);

    if (index > -1) {
      this._attachedOverlays.splice(index, 1);
    }

    // Remove the global listener once there are no more overlays.
    if (this._attachedOverlays.length === 0) {
      this._detach();
    }
  }

  /** Detaches the global keyboard event listener. */
  private _detach() {
    if (this._isAttached) {
      this._document.body.removeEventListener('click', this._clickListener, true);
      this._isAttached = false;
    }
  }

  /** Click event listener that will be attached to the body propagate phase. */
  private _clickListener = (event: MouseEvent) => {
    const overlays = this._attachedOverlays;

    for (let i = overlays.length - 1; i > -1; i--) {
      const overlayRef: OverlayRef = overlays[i];
      const overlayRect = overlayRef.overlayElement.getBoundingClientRect();

      
      const isOutsideClick =
        event.clientX < overlayRect.left && overlayRect.right < event.clientX &&
        event.clientY < overlayRect.top && overlayRect.bottom < event.clientY

      // If is outside click check if we should detach overlay. If so detach it
      // If not outside click return - the click is on overlay and we should do nothing
      if (isOutsideClick) {
        if (overlayRef.getConfig().detachOnOutsideClick) {
          overlayRef.detach();
        }
      } else {
        return;
      }
    }
  }
}
