export declare class BreakpointObserver implements OnDestroy {
    constructor(_mediaMatcher: MediaMatcher, _zone: NgZone);
    isMatched(value: string | string[]): boolean;
    ngOnDestroy(): void;
    observe(value: string | string[]): Observable<BreakpointState>;
    static ɵfac: i0.ɵɵFactoryDef<BreakpointObserver, never>;
    static ɵprov: i0.ɵɵInjectableDef<BreakpointObserver>;
}

export declare const Breakpoints: {
    XSmall: string;
    Small: string;
    Medium: string;
    Large: string;
    XLarge: string;
    Handset: string;
    Tablet: string;
    Web: string;
    HandsetPortrait: string;
    TabletPortrait: string;
    WebPortrait: string;
    HandsetLandscape: string;
    TabletLandscape: string;
    WebLandscape: string;
};

export interface BreakpointState {
    breakpoints: {
        [key: string]: boolean;
    };
    matches: boolean;
}

export declare class LayoutModule {
    static ɵinj: i0.ɵɵInjectorDef<LayoutModule>;
    static ɵmod: i0.ɵɵNgModuleDefWithMeta<LayoutModule, never, never, never>;
}

export declare class MediaMatcher {
    constructor(_platform: Platform);
    matchMedia(query: string): MediaQueryList;
    static ɵfac: i0.ɵɵFactoryDef<MediaMatcher, never>;
    static ɵprov: i0.ɵɵInjectableDef<MediaMatcher>;
}
