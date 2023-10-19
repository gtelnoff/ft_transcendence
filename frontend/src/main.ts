import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { AppModule } from "./app/app.module";

if (window) {
  window.console.log =
    window.console.warn =
    window.console.info =
    window.console.error =
      function () {
        // no logs in production
      };
}
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
