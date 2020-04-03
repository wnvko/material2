/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {UpdatedGoogleMap} from '../google-map/google-map';

/** Window interface for testing */
export interface TestingWindow extends Window {
  google?: {
    maps: {
      Map?: jasmine.Spy;
      Marker?: jasmine.Spy;
      InfoWindow?: jasmine.Spy;
      Polyline?: jasmine.Spy;
      Polygon?: jasmine.Spy;
      Rectangle?: jasmine.Spy;
      Circle?: jasmine.Spy;
    };
  };
}

/** Creates a jasmine.SpyObj for a google.maps.Map. */
export function createMapSpy(options: google.maps.MapOptions): jasmine.SpyObj<UpdatedGoogleMap> {
  const mapSpy = jasmine.createSpyObj('google.maps.Map', [
    'setOptions', 'setCenter', 'setZoom', 'setMap', 'addListener', 'fitBounds', 'panBy', 'panTo',
    'panToBounds', 'getBounds', 'getCenter', 'getClickableIcons', 'getHeading', 'getMapTypeId',
    'getProjection', 'getStreetView', 'getTilt', 'getZoom', 'setMapTypeId'
  ]);
  mapSpy.addListener.and.returnValue({remove: () => {}});
  return mapSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Map. */
export function createMapConstructorSpy(
    mapSpy: jasmine.SpyObj<UpdatedGoogleMap>, apiLoaded = true): jasmine.Spy {
  const mapConstructorSpy =
      jasmine.createSpy('Map constructor', (_el: Element, _options: google.maps.MapOptions) => {
        return mapSpy;
      });
  const testingWindow: TestingWindow = window;
  if (apiLoaded) {
    testingWindow.google = {
      maps: {
        'Map': mapConstructorSpy,
      }
    };
  }
  return mapConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.Marker */
export function createMarkerSpy(options: google.maps.MarkerOptions):
    jasmine.SpyObj<google.maps.Marker> {
  const markerSpy = jasmine.createSpyObj('google.maps.Marker', [
    'setOptions', 'setMap', 'addListener', 'getAnimation', 'getClickable', 'getCursor',
    'getDraggable', 'getIcon', 'getLabel', 'getOpacity', 'getPosition', 'getShape', 'getTitle',
    'getVisible', 'getZIndex'
  ]);
  markerSpy.addListener.and.returnValue({remove: () => {}});
  return markerSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Marker */
export function createMarkerConstructorSpy(markerSpy: jasmine.SpyObj<google.maps.Marker>):
    jasmine.Spy {
  const markerConstructorSpy =
      jasmine.createSpy('Marker constructor', (_options: google.maps.MarkerOptions) => {
        return markerSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['Marker'] = markerConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'Marker': markerConstructorSpy,
      },
    };
  }
  return markerConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.InfoWindow */
export function createInfoWindowSpy(options: google.maps.InfoWindowOptions):
    jasmine.SpyObj<google.maps.InfoWindow> {
  const infoWindowSpy = jasmine.createSpyObj(
      'google.maps.InfoWindow',
      ['addListener', 'close', 'getContent', 'getPosition', 'getZIndex', 'open']);
  infoWindowSpy.addListener.and.returnValue({remove: () => {}});
  return infoWindowSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.InfoWindow */
export function createInfoWindowConstructorSpy(
    infoWindowSpy: jasmine.SpyObj<google.maps.InfoWindow>): jasmine.Spy {
  const infoWindowConstructorSpy =
      jasmine.createSpy('InfoWindow constructor', (_options: google.maps.InfoWindowOptions) => {
        return infoWindowSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['InfoWindow'] = infoWindowConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'InfoWindow': infoWindowConstructorSpy,
      },
    };
  }
  return infoWindowConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.Polyline */
export function createPolylineSpy(options: google.maps.PolylineOptions):
    jasmine.SpyObj<google.maps.Polyline> {
  const polylineSpy = jasmine.createSpyObj('google.maps.Polyline', [
    'addListener', 'getDraggable', 'getEditable', 'getPath', 'getVisible', 'setMap', 'setOptions',
    'setPath'
  ]);
  polylineSpy.addListener.and.returnValue({remove: () => {}});
  return polylineSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Polyline */
export function createPolylineConstructorSpy(polylineSpy: jasmine.SpyObj<google.maps.Polyline>):
    jasmine.Spy {
  const polylineConstructorSpy =
      jasmine.createSpy('Polyline constructor', (_options: google.maps.PolylineOptions) => {
        return polylineSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['Polyline'] = polylineConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'Polyline': polylineConstructorSpy,
      },
    };
  }
  return polylineConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.Polygon */
export function createPolygonSpy(options: google.maps.PolygonOptions):
    jasmine.SpyObj<google.maps.Polygon> {
  const polygonSpy = jasmine.createSpyObj('google.maps.Polygon', [
    'addListener', 'getDraggable', 'getEditable', 'getPath', 'getPaths', 'getVisible', 'setMap',
    'setOptions', 'setPath'
  ]);
  polygonSpy.addListener.and.returnValue({remove: () => {}});
  return polygonSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Polygon */
export function createPolygonConstructorSpy(polygonSpy: jasmine.SpyObj<google.maps.Polygon>):
    jasmine.Spy {
  const polygonConstructorSpy =
      jasmine.createSpy('Polygon constructor', (_options: google.maps.PolygonOptions) => {
        return polygonSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['Polygon'] = polygonConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'Polygon': polygonConstructorSpy,
      },
    };
  }
  return polygonConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.Rectangle */
export function createRectangleSpy(options: google.maps.RectangleOptions):
    jasmine.SpyObj<google.maps.Rectangle> {
  const rectangleSpy = jasmine.createSpyObj('google.maps.Rectangle', [
    'addListener', 'getBounds', 'getDraggable', 'getEditable', 'getVisible', 'setMap', 'setOptions',
    'setBounds'
  ]);
  rectangleSpy.addListener.and.returnValue({remove: () => {}});
  return rectangleSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Rectangle */
export function createRectangleConstructorSpy(rectangleSpy: jasmine.SpyObj<google.maps.Rectangle>):
    jasmine.Spy {
  const rectangleConstructorSpy =
      jasmine.createSpy('Rectangle constructor', (_options: google.maps.RectangleOptions) => {
        return rectangleSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['Rectangle'] = rectangleConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'Rectangle': rectangleConstructorSpy,
      },
    };
  }
  return rectangleConstructorSpy;
}

/** Creates a jasmine.SpyObj for a google.maps.Circle */
export function createCircleSpy(options: google.maps.CircleOptions):
    jasmine.SpyObj<google.maps.Circle> {
  const circleSpy = jasmine.createSpyObj('google.maps.Circle', [
    'addListener', 'getCenter', 'getRadius', 'getDraggable', 'getEditable', 'getVisible', 'setMap',
    'setOptions', 'setCenter', 'setRadius'
  ]);
  circleSpy.addListener.and.returnValue({remove: () => {}});
  return circleSpy;
}

/** Creates a jasmine.Spy to watch for the constructor of a google.maps.Circle */
export function createCircleConstructorSpy(circleSpy: jasmine.SpyObj<google.maps.Circle>):
    jasmine.Spy {
  const circleConstructorSpy =
      jasmine.createSpy('Circle constructor', (_options: google.maps.CircleOptions) => {
        return circleSpy;
      });
  const testingWindow: TestingWindow = window;
  if (testingWindow.google && testingWindow.google.maps) {
    testingWindow.google.maps['Circle'] = circleConstructorSpy;
  } else {
    testingWindow.google = {
      maps: {
        'Circle': circleConstructorSpy,
      },
    };
  }
  return circleConstructorSpy;
}
