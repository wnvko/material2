/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {coerceBooleanProperty, coerceNumberProperty} from '@angular/cdk/coercion';
import {ComponentHarness, HarnessPredicate} from '@angular/cdk/testing';
import {SliderHarnessFilters} from '@angular/material/slider/testing';

/** Harness for interacting with a MDC mat-slider in tests. */
export class MatSliderHarness extends ComponentHarness {
  static hostSelector = 'mat-slider';

  /**
   * Gets a `HarnessPredicate` that can be used to search for a mat-slider with
   * specific attributes.
   * @param options Options for narrowing the search:
   *   - `selector` finds a slider whose host element matches the given selector.
   *   - `id` finds a slider with specific id.
   * @return a `HarnessPredicate` configured with the given options.
   */
  static with(options: SliderHarnessFilters = {}): HarnessPredicate<MatSliderHarness> {
    return new HarnessPredicate(MatSliderHarness, options);
  }

  private _textLabel = this.locatorForOptional('.mdc-slider__pin-value-marker');
  private _trackContainer = this.locatorFor('.mdc-slider__track-container');

  /** Gets the slider's id. */
  async getId(): Promise<string|null> {
    const id = await (await this.host()).getProperty('id');
    // In case no id has been specified, the "id" property always returns
    // an empty string. To make this method more explicit, we return null.
    return id !== '' ? id : null;
  }

  /**
   * Gets the current display value of the slider. Returns null if the thumb
   * label is disabled.
   */
  async getDisplayValue(): Promise<string|null> {
    const textLabelEl = await this._textLabel();
    return textLabelEl ? textLabelEl.text() : null;
  }

  /** Gets the current percentage value of the slider. */
  async getPercentage(): Promise<number> {
    return this._calculatePercentage(await this.getValue());
  }

  /** Gets the current value of the slider. */
  async getValue(): Promise<number> {
    return coerceNumberProperty(await (await this.host()).getAttribute('aria-valuenow'));
  }

  /** Gets the maximum value of the slider. */
  async getMaxValue(): Promise<number> {
    return coerceNumberProperty(await (await this.host()).getAttribute('aria-valuemax'));
  }

  /** Gets the minimum value of the slider. */
  async getMinValue(): Promise<number> {
    return coerceNumberProperty(await (await this.host()).getAttribute('aria-valuemin'));
  }

  /** Whether the slider is disabled. */
  async isDisabled(): Promise<boolean> {
    const disabled = (await this.host()).getAttribute('aria-disabled');
    return coerceBooleanProperty(await disabled);
  }

  /** Gets the orientation of the slider. */
  async getOrientation(): Promise<'horizontal'> {
    // "aria-orientation" will always be set to "horizontal" for the MDC
    // slider as there is no vertical slider support yet.
    return (await this.host()).getAttribute('aria-orientation') as Promise<'horizontal'>;
  }

  /**
   * Sets the value of the slider by clicking on the slider track.
   *
   * Note that in rare cases the value cannot be set to the exact specified value. This
   * can happen if not every value of the slider maps to a single pixel that could be
   * clicked using mouse interaction. In such cases consider using the keyboard to
   * select the given value or expand the slider's size for a better user experience.
   */
  async setValue(value: number): Promise<void> {
    // Need to wait for async tasks outside Angular to complete. This is necessary because
    // whenever directionality changes, the slider updates the element dimensions in the next
    // tick (in a timer outside of the NgZone). Since this method relies on the element
    // dimensions to be updated, we wait for the delayed calculation task to complete.
    await this.waitForTasksOutsideAngular();

    const [sliderEl, trackContainer] =
        await Promise.all([this.host(), this._trackContainer()]);
    let percentage = await this._calculatePercentage(value);
    const {width} = await trackContainer.getDimensions();

    // In case the slider is displayed in RTL mode, we need to invert the
    // percentage so that the proper value is set.
    if (await sliderEl.hasClass('mat-slider-invert-mouse-coords')) {
      percentage = 1 - percentage;
    }

    // We need to round the new coordinates because creating fake DOM
    // events will cause the coordinates to be rounded down.
    await sliderEl.click(Math.round(width * percentage), 0);
  }

  /**
   * Focuses the slider and returns a void promise that indicates when the
   * action is complete.
   */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /**
   * Blurs the slider and returns a void promise that indicates when the
   * action is complete.
   */
  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  /** Calculates the percentage of the given value. */
  private async _calculatePercentage(value: number) {
    const [min, max] = await Promise.all([this.getMinValue(), this.getMaxValue()]);
    return (value - min) / (max - min);
  }
}
