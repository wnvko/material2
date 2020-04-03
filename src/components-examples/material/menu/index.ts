import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MenuIconsExample} from './menu-icons/menu-icons-example';
import {MenuOverviewExample} from './menu-overview/menu-overview-example';
import {MenuPositionExample} from './menu-position/menu-position-example';
import {NestedMenuExample} from './nested-menu/nested-menu-example';

export {
  MenuIconsExample,
  MenuOverviewExample,
  MenuPositionExample,
  NestedMenuExample,
};

const EXAMPLES = [
  MenuIconsExample,
  MenuOverviewExample,
  MenuPositionExample,
  NestedMenuExample,
];

@NgModule({
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  declarations: EXAMPLES,
  exports: EXAMPLES,
  entryComponents: EXAMPLES,
})
export class MenuExamplesModule {
}
