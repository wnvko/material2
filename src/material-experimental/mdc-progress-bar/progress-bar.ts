/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  ElementRef,
  NgZone,
  Optional,
  Inject,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {CanColor, CanColorCtor, mixinColor} from '@angular/material/core';
import {ANIMATION_MODULE_TYPE} from '@angular/platform-browser/animations';
import {ProgressAnimationEnd} from '@angular/material/progress-bar';
import {MDCLinearProgressAdapter, MDCLinearProgressFoundation} from '@material/linear-progress';
import {Subscription, fromEvent, Observable} from 'rxjs';
import {filter} from 'rxjs/operators';
import {Directionality} from '@angular/cdk/bidi';
import {Platform} from '@angular/cdk/platform';

// Boilerplate for applying mixins to MatProgressBar.
/** @docs-private */
class MatProgressBarBase {
  constructor(public _elementRef: ElementRef) { }
}

const _MatProgressBarMixinBase: CanColorCtor & typeof MatProgressBarBase =
    mixinColor(MatProgressBarBase, 'primary');

export type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';

@Component({
  selector: 'mat-progress-bar',
  exportAs: 'matProgressBar',
  host: {
    'role': 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': '(mode === "indeterminate" || mode === "query") ? null : value',
    '[attr.mode]': 'mode',
    'class': 'mat-mdc-progress-bar',
    '[class._mat-animation-noopable]': '_isNoopAnimation',
  },
  inputs: ['color'],
  templateUrl: 'progress-bar.html',
  styleUrls: ['progress-bar.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MatProgressBar extends _MatProgressBarMixinBase implements AfterViewInit, OnDestroy,
  CanColor {

  constructor(public _elementRef: ElementRef<HTMLElement>,
              private _ngZone: NgZone,
              private _platform: Platform,
              @Optional() private _dir?: Directionality,
              @Optional() @Inject(ANIMATION_MODULE_TYPE) public _animationMode?: string) {
    super(_elementRef);
    this._isNoopAnimation = _animationMode === 'NoopAnimations';
    if (_dir) {
      this._dirChangeSubscription = _dir.change.subscribe(() => this._syncFoundation());
    }
  }

  /** Implements all of the logic of the MDC progress bar. */
  private _foundation: MDCLinearProgressFoundation | undefined;

  /** Adapter used by MDC to interact with the DOM. */
  private _adapter: MDCLinearProgressAdapter = {
    addClass: (className: string) => this._rootElement.classList.add(className),
    forceLayout: () => this._platform.isBrowser && this._rootElement.offsetWidth,
    removeAttribute: (name: string) => this._rootElement.removeAttribute(name),
    setAttribute: (name: string, value: string) => this._rootElement.setAttribute(name, value),
    hasClass: (className: string) => this._rootElement.classList.contains(className),
    removeClass: (className: string) => this._rootElement.classList.remove(className),
    setPrimaryBarStyle: (styleProperty: string, value: string) => {
      (this._primaryBar.style as any)[styleProperty] = value;
    },
    setBufferBarStyle: (styleProperty: string, value: string) => {
      (this._bufferBar.style as any)[styleProperty] = value;
    }
  };

  /** Flag that indicates whether NoopAnimations mode is set to true. */
  _isNoopAnimation = false;

  /** Value of the progress bar. Defaults to zero. Mirrored to aria-valuenow. */
  @Input()
  get value(): number { return this._value; }
  set value(v: number) {
    this._value = clamp(v || 0);
    this._syncFoundation();
  }
  private _value = 0;

  /** Buffer value of the progress bar. Defaults to zero. */
  @Input()
  get bufferValue(): number { return this._bufferValue || 0; }
  set bufferValue(v: number) {
    this._bufferValue = clamp(v || 0);
    this._syncFoundation();
  }
  private _bufferValue = 0;

  private _rootElement: HTMLElement;
  private _primaryBar: HTMLElement;
  private _bufferBar: HTMLElement;

  /**
   * Event emitted when animation of the primary progress bar completes. This event will not
   * be emitted when animations are disabled, nor will it be emitted for modes with continuous
   * animations (indeterminate and query).
   */
  @Output() animationEnd = new EventEmitter<ProgressAnimationEnd>();

  /** Reference to animation end subscription to be unsubscribed on destroy. */
  private _animationEndSubscription = Subscription.EMPTY;

  /** Subscription to when the layout direction changes. */
  private _dirChangeSubscription = Subscription.EMPTY;

  /**
   * Mode of the progress bar.
   *
   * Input must be one of these values: determinate, indeterminate, buffer, query, defaults to
   * 'determinate'.
   * Mirrored to mode attribute.
   */
  @Input()
  get mode(): ProgressBarMode { return this._mode; }
  set mode(value: ProgressBarMode) {
    // Note that we don't technically need a getter and a setter here,
    // but we use it to match the behavior of the existing mat-progress-bar.
    this._mode = value;
    this._syncFoundation();
  }
  private _mode: ProgressBarMode = 'determinate';

  ngAfterViewInit() {
    const element = this._elementRef.nativeElement;

    this._rootElement = element.querySelector('.mdc-linear-progress') as HTMLElement;
    this._primaryBar = element.querySelector('.mdc-linear-progress__primary-bar') as HTMLElement;
    this._bufferBar = element.querySelector('.mdc-linear-progress__buffer-bar') as HTMLElement;

    this._foundation = new MDCLinearProgressFoundation(this._adapter);
    this._foundation.init();
    this._syncFoundation();

    // Run outside angular so change detection didn't get triggered on every transition end
    // instead only on the animation that we care about (primary value bar's transitionend)
    this._ngZone.runOutsideAngular((() => {
      this._animationEndSubscription =
          (fromEvent(this._primaryBar, 'transitionend') as Observable<TransitionEvent>)
            .pipe(filter(((e: TransitionEvent) => e.target === this._primaryBar)))
            .subscribe(() => {
              if (this.mode === 'determinate' || this.mode === 'buffer') {
                this._ngZone.run(() => this.animationEnd.next({value: this.value}));
              }
            });
    }));
  }

  ngOnDestroy() {
    if (this._foundation) {
      this._foundation.destroy();
    }
    this._animationEndSubscription.unsubscribe();
    this._dirChangeSubscription.unsubscribe();
  }

  /** Syncs the state of the progress bar with the MDC foundation. */
  private _syncFoundation() {
    const foundation = this._foundation;

    // Don't sync any state if we're not in a browser, because MDC uses some window APIs.
    if (foundation && this._platform.isBrowser) {
      const direction = this._dir ? this._dir.value : 'ltr';
      const mode = this.mode;

      foundation.setReverse(direction === 'rtl' ? mode !== 'query' : mode === 'query');
      foundation.setDeterminate(mode !== 'indeterminate' && mode !== 'query');

      // Divide by 100 because MDC deals with values between 0 and 1.
      foundation.setProgress(this.value / 100);

      if (mode === 'buffer') {
        foundation.setBuffer(this.bufferValue / 100);
      }
    }
  }
}

/** Clamps a value to be between two numbers, by default 0 and 100. */
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}
