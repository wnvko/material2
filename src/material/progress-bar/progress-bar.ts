/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {coerceNumberProperty} from '@angular/cdk/coercion';
import {DOCUMENT} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  Optional,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {CanColor, CanColorCtor, mixinColor} from '@angular/material/core';
import {ANIMATION_MODULE_TYPE} from '@angular/platform-browser/animations';
import {fromEvent, Observable, Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';


// TODO(josephperrott): Benchpress tests.
// TODO(josephperrott): Add ARIA attributes for progress bar "for".

/** Last animation end data. */
export interface ProgressAnimationEnd {
  value: number;
}

// Boilerplate for applying mixins to MatProgressBar.
/** @docs-private */
class MatProgressBarBase {
  constructor(public _elementRef: ElementRef) { }
}

const _MatProgressBarMixinBase: CanColorCtor & typeof MatProgressBarBase =
    mixinColor(MatProgressBarBase, 'primary');

/**
 * Injection token used to provide the current location to `MatProgressBar`.
 * Used to handle server-side rendering and to stub out during unit tests.
 * @docs-private
 */
export const MAT_PROGRESS_BAR_LOCATION = new InjectionToken<MatProgressBarLocation>(
  'mat-progress-bar-location',
  {providedIn: 'root', factory: MAT_PROGRESS_BAR_LOCATION_FACTORY}
);

/**
 * Stubbed out location for `MatProgressBar`.
 * @docs-private
 */
export interface MatProgressBarLocation {
  getPathname: () => string;
}

/** @docs-private */
export function MAT_PROGRESS_BAR_LOCATION_FACTORY(): MatProgressBarLocation {
  const _document = inject(DOCUMENT);
  const _location = _document ? _document.location : null;

  return {
    // Note that this needs to be a function, rather than a property, because Angular
    // will only resolve it once, but we want the current path on each call.
    getPathname: () => _location ? (_location.pathname + _location.search) : ''
  };
}

export type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';

/** Counter used to generate unique IDs for progress bars. */
let progressbarId = 0;

/**
 * `<mat-progress-bar>` component.
 */
@Component({
  selector: 'mat-progress-bar',
  exportAs: 'matProgressBar',
  host: {
    'role': 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': '(mode === "indeterminate" || mode === "query") ? null : value',
    '[attr.mode]': 'mode',
    'class': 'mat-progress-bar',
    '[class._mat-animation-noopable]': '_isNoopAnimation',
  },
  inputs: ['color'],
  templateUrl: 'progress-bar.html',
  styleUrls: ['progress-bar.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MatProgressBar extends _MatProgressBarMixinBase implements CanColor,
                                                      AfterViewInit, OnDestroy {
  constructor(public _elementRef: ElementRef, private _ngZone: NgZone,
              @Optional() @Inject(ANIMATION_MODULE_TYPE) public _animationMode?: string,
              /**
               * @deprecated `location` parameter to be made required.
               * @breaking-change 8.0.0
               */
              @Optional() @Inject(MAT_PROGRESS_BAR_LOCATION) location?: MatProgressBarLocation) {
    super(_elementRef);

    // We need to prefix the SVG reference with the current path, otherwise they won't work
    // in Safari if the page has a `<base>` tag. Note that we need quotes inside the `url()`,

    // because named route URLs can contain parentheses (see #12338). Also we don't use since
    // we can't tell the difference between whether
    // the consumer is using the hash location strategy or not, because `Location` normalizes
    // both `/#/foo/bar` and `/foo/bar` to the same thing.
    const path = location ? location.getPathname().split('#')[0] : '';
    this._rectangleFillValue = `url('${path}#${this.progressbarId}')`;
    this._isNoopAnimation = _animationMode === 'NoopAnimations';
  }

  /** Flag that indicates whether NoopAnimations mode is set to true. */
  _isNoopAnimation = false;

  /** Value of the progress bar. Defaults to zero. Mirrored to aria-valuenow. */
  @Input()
  get value(): number { return this._value; }
  set value(v: number) {
    this._value = clamp(coerceNumberProperty(v) || 0);

    // When noop animation is set to true, trigger animationEnd directly.
    if (this._isNoopAnimation) {
      this._emitAnimationEnd();
    }
  }
  private _value: number = 0;

  /** Buffer value of the progress bar. Defaults to zero. */
  @Input()
  get bufferValue(): number { return this._bufferValue; }
  set bufferValue(v: number) { this._bufferValue = clamp(v || 0); }
  private _bufferValue: number = 0;

  @ViewChild('primaryValueBar') _primaryValueBar: ElementRef;

  /**
   * Event emitted when animation of the primary progress bar completes. This event will not
   * be emitted when animations are disabled, nor will it be emitted for modes with continuous
   * animations (indeterminate and query).
   */
  @Output() animationEnd = new EventEmitter<ProgressAnimationEnd>();

  /** Reference to animation end subscription to be unsubscribed on destroy. */
  private _animationEndSubscription: Subscription = Subscription.EMPTY;

  /**
   * Mode of the progress bar.
   *
   * Input must be one of these values: determinate, indeterminate, buffer, query, defaults to
   * 'determinate'.
   * Mirrored to mode attribute.
   */
  @Input() mode: ProgressBarMode = 'determinate';

  /** ID of the progress bar. */
  progressbarId = `mat-progress-bar-${progressbarId++}`;

  /** Attribute to be used for the `fill` attribute on the internal `rect` element. */
  _rectangleFillValue: string;

  /** Gets the current transform value for the progress bar's primary indicator. */
  _primaryTransform() {
    const scale = this.value / 100;
    return {transform: `scaleX(${scale})`};
  }

  /**
   * Gets the current transform value for the progress bar's buffer indicator. Only used if the
   * progress mode is set to buffer, otherwise returns an undefined, causing no transformation.
   */
  _bufferTransform() {
    if (this.mode === 'buffer') {
      const scale = this.bufferValue / 100;
      return {transform: `scaleX(${scale})`};
    }
    return null;
  }

  ngAfterViewInit() {
    if (!this._isNoopAnimation) {
      // Run outside angular so change detection didn't get triggered on every transition end
      // instead only on the animation that we care about (primary value bar's transitionend)
      this._ngZone.runOutsideAngular((() => {
        const element = this._primaryValueBar.nativeElement;

        this._animationEndSubscription =
            (fromEvent(element, 'transitionend') as Observable<TransitionEvent>)
              .pipe(filter(((e: TransitionEvent) => e.target === element)))
              .subscribe(() => this._ngZone.run(() => this._emitAnimationEnd()));
      }));
    }
  }

  ngOnDestroy() {
    this._animationEndSubscription.unsubscribe();
  }

  /** Emit an animationEnd event if in determinate or buffer mode. */
  private _emitAnimationEnd(): void {
    if (this.mode === 'determinate' || this.mode === 'buffer') {
      this.animationEnd.next({value: this.value});
    }
  }

  static ngAcceptInputType_value: number | string | null | undefined;
}

/** Clamps a value to be between two numbers, by default 0 and 100. */
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}
