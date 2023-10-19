import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { BackendService } from "../backend.service";

@Injectable({
  providedIn: "root",
})
export class TwoFAService {
  constructor(private backendService: BackendService) {}

  async checkCode(code: string | null) {
    let url: string;
    url = "/player/me";
    return await lastValueFrom(this.backendService.get(url));
  }
}
