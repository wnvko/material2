/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * A pending copy-to-clipboard operation.
 *
 * The implementation of copying text to the clipboard modifies the DOM and
 * forces a relayout. This relayout can take too long if the string is large,
 * causing the execCommand('copy') to happen too long after the user clicked.
 * This results in the browser refusing to copy. This object lets the
 * relayout happen in a separate tick from copying by providing a copy function
 * that can be called later.
 *
 * Destroy must be called when no longer in use, regardless of whether `copy` is
 * called.
 */
export class PendingCopy {
  private _textarea: HTMLTextAreaElement|undefined;

  constructor(text: string, private readonly _document: Document) {
    const textarea = this._textarea = this._document.createElement('textarea');
    const styles = textarea.style;

    // Hide the element for display and accessibility. Set an
    // absolute position so the page layout isn't affected.
    styles.opacity = '0';
    styles.position = 'absolute';
    styles.left = styles.top = '-999em';
    textarea.setAttribute('aria-hidden', 'true');
    textarea.value = text;
    this._document.body.appendChild(textarea);
  }

  /** Finishes copying the text. */
  copy(): boolean {
    const textarea = this._textarea;
    let successful = false;

    try {  // Older browsers could throw if copy is not supported.
      if (textarea) {
        const currentFocus = this._document.activeElement;

        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        successful = this._document.execCommand('copy');

        if (currentFocus && currentFocus instanceof HTMLElement) {
          currentFocus.focus();
        }
      }
    } catch {
      // Discard error.
      // Initial setting of {@code successful} will represent failure here.
    }

    return successful;
  }

  /** Cleans up DOM changes used to perform the copy operation. */
  destroy() {
    const textarea = this._textarea;

    if (textarea) {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }

      this._textarea = undefined;
    }
  }
}
