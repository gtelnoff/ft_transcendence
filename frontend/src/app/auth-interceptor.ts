import {
  HttpInterceptor,
  HttpErrorResponse,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { CookieService } from "ngx-cookie-service";
import { Observable, of, throwError, catchError, EMPTY } from "rxjs";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private cookieService: CookieService) {}

  private handleAuthError(err: HttpErrorResponse): Observable<any> {
    if (err.status === 401 || err.status === 403) {
      if (this.cookieService.get("jwtToken")) {
        this.cookieService.delete("jwtToken");
      }
      if (!this.router.routerState.snapshot.url.startsWith("/login"))
        this.router.navigateByUrl(
          `/login?returnUrl=` +
            encodeURIComponent(this.router.routerState.snapshot.url)
        );
    }
    return of(EMPTY);
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.cookieService.get("jwtToken")) {
      if (!this.router.routerState.snapshot.url.startsWith("/login")) {
        this.router.navigateByUrl(
          `/login?returnUrl=` +
            encodeURIComponent(this.router.routerState.snapshot.url)
        );
        return of(new HttpResponse({ status: 200 }));
      }
    }
    const authReq = req.clone({
      headers: req.headers.set(
        "Authorization",
        "Bearer " + this.cookieService.get("jwtToken")
      ),
    });
    return next
      .handle(authReq)
      .pipe(catchError((x) => this.handleAuthError(x)));
  }
}
