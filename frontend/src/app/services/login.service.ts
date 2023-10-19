import { Injectable } from "@angular/core";
import { BackendService } from "./backend.service";
import { lastValueFrom } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class LoginService {
  constructor(private backendService: BackendService) {}

  isAuthenticated(): Boolean {
    try {
      lastValueFrom(this.backendService.get("/auth/logged"));
      return true;
    } catch {
      return false;
    }
  }
}
