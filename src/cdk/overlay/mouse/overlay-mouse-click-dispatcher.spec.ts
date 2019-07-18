import {TestBed, inject} from '@angular/core/testing';
import {dispatchKeyboardEvent} from '@angular/cdk/testing';
import {ESCAPE} from '@angular/cdk/keycodes';
import {Component, NgModule} from '@angular/core';
import {OverlayModule, OverlayContainer, Overlay} from '../index';
import {OverlayMouseClickDispatcher} from './overlay-mouse-click-dispatcher';
import {ComponentPortal} from '@angular/cdk/portal';


describe('OverlayMouseClickDispatcher', () => {
  let mouseClickDispatcher: OverlayMouseClickDispatcher;
  let overlay: Overlay;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule, TestComponentModule],
    });

    inject([OverlayMouseClickDispatcher, Overlay],
      (mcd: OverlayMouseClickDispatcher, o: Overlay) => {
      mouseClickDispatcher = mcd;
      overlay = o;
    })();
  });

  afterEach(inject([OverlayContainer], (overlayContainer: OverlayContainer) => {
    overlayContainer.ngOnDestroy();
  }));

  fit('should track overlays in order as they are attached and detached', () => {
    const overlayOne = overlay.create();
    const overlayTwo = overlay.create();

    // Attach overlays
    mouseClickDispatcher.add(overlayOne);
    mouseClickDispatcher.add(overlayTwo);

    expect(mouseClickDispatcher._attachedOverlays.length)
        .toBe(2, 'Expected both overlays to be tracked.');
    expect(mouseClickDispatcher._attachedOverlays[0]).toBe(overlayOne, 'Expected one to be first.');
    expect(mouseClickDispatcher._attachedOverlays[1]).toBe(overlayTwo, 'Expected two to be last.');

    // Detach first one and re-attach it
    mouseClickDispatcher.remove(overlayOne);
    mouseClickDispatcher.add(overlayOne);

    expect(mouseClickDispatcher._attachedOverlays[0])
        .toBe(overlayTwo, 'Expected two to now be first.');
    expect(mouseClickDispatcher._attachedOverlays[1])
        .toBe(overlayOne, 'Expected one to now be last.');
  });

  it('should dispatch body keyboard events to the most recently attached overlay', () => {
    const overlayOne = overlay.create();
    const overlayTwo = overlay.create();
    const overlayOneSpy = jasmine.createSpy('overlayOne keyboard event spy');
    const overlayTwoSpy = jasmine.createSpy('overlayTwo keyboard event spy');

    overlayOne.keydownEvents().subscribe(overlayOneSpy);
    overlayTwo.keydownEvents().subscribe(overlayTwoSpy);

    // Attach overlays
    mouseClickDispatcher.add(overlayOne);
    mouseClickDispatcher.add(overlayTwo);

    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE);

    // Most recent overlay should receive event
    expect(overlayOneSpy).not.toHaveBeenCalled();
    expect(overlayTwoSpy).toHaveBeenCalled();
  });

  it('should not dispatch keyboard events when propagation is stopped', () => {
    const overlayRef = overlay.create();
    const spy = jasmine.createSpy('keyboard event spy');
    const button = document.createElement('button');

    document.body.appendChild(button);
    button.addEventListener('keydown', event => event.stopPropagation());

    overlayRef.keydownEvents().subscribe(spy);
    mouseClickDispatcher.add(overlayRef);
    dispatchKeyboardEvent(button, 'keydown', ESCAPE);

    expect(spy).not.toHaveBeenCalled();

    button.parentNode!.removeChild(button);
  });

  it('should complete the keydown stream on dispose', () => {
    const overlayRef = overlay.create();
    const completeSpy = jasmine.createSpy('keydown complete spy');

    overlayRef.keydownEvents().subscribe({complete: completeSpy});

    overlayRef.dispose();

    expect(completeSpy).toHaveBeenCalled();
  });

  it('should stop emitting events to detached overlays', () => {
    const instance = overlay.create();
    const spy = jasmine.createSpy('keyboard event spy');

    instance.attach(new ComponentPortal(TestComponent));
    instance.keydownEvents().subscribe(spy);

    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE, instance.overlayElement);
    expect(spy).toHaveBeenCalledTimes(1);

    instance.detach();
    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE, instance.overlayElement);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should stop emitting events to disposed overlays', () => {
    const instance = overlay.create();
    const spy = jasmine.createSpy('keyboard event spy');

    instance.attach(new ComponentPortal(TestComponent));
    instance.keydownEvents().subscribe(spy);

    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE, instance.overlayElement);
    expect(spy).toHaveBeenCalledTimes(1);

    instance.dispose();
    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE, instance.overlayElement);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should dispose of the global keyboard event handler correctly', () => {
    const overlayRef = overlay.create();
    const body = document.body;

    spyOn(body, 'addEventListener');
    spyOn(body, 'removeEventListener');

    mouseClickDispatcher.add(overlayRef);
    expect(body.addEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function));

    overlayRef.dispose();
    expect(body.removeEventListener).toHaveBeenCalledWith('keydown', jasmine.any(Function));
  });

  it('should skip overlays that do not have keydown event subscriptions', () => {
    const overlayOne = overlay.create();
    const overlayTwo = overlay.create();
    const overlayOneSpy = jasmine.createSpy('overlayOne keyboard event spy');

    overlayOne.keydownEvents().subscribe(overlayOneSpy);
    mouseClickDispatcher.add(overlayOne);
    mouseClickDispatcher.add(overlayTwo);

    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE);

    expect(overlayOneSpy).toHaveBeenCalled();
  });

  it('should not add the same overlay to the stack multiple times', () => {
    const overlayOne = overlay.create();
    const overlayTwo = overlay.create();
    const overlayOneSpy = jasmine.createSpy('overlayOne keyboard event spy');
    const overlayTwoSpy = jasmine.createSpy('overlayTwo keyboard event spy');

    overlayOne.keydownEvents().subscribe(overlayOneSpy);
    overlayTwo.keydownEvents().subscribe(overlayTwoSpy);

    mouseClickDispatcher.add(overlayOne);
    mouseClickDispatcher.add(overlayTwo);
    mouseClickDispatcher.add(overlayOne);

    dispatchKeyboardEvent(document.body, 'keydown', ESCAPE);

    expect(mouseClickDispatcher._attachedOverlays).toEqual([overlayTwo, overlayOne]);

    expect(overlayTwoSpy).not.toHaveBeenCalled();
    expect(overlayOneSpy).toHaveBeenCalled();
  });

});


@Component({
  template: 'Hello'
})
class TestComponent { }


// Create a real (non-test) NgModule as a workaround for
// https://github.com/angular/angular/issues/10760
@NgModule({
  exports: [TestComponent],
  declarations: [TestComponent],
  entryComponents: [TestComponent],
})
class TestComponentModule { }
