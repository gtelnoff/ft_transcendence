import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, lastValueFrom } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class BackendService {
  constructor(private http: HttpClient) {}

  async redirectIfUnauthorized() {
    let response = this.get("/auth/logged").subscribe();
  }

  get(endpoint: string): Observable<any> {
    return this.http.get<any>(
      "http://" + window.location.hostname + ":3000" + endpoint
    );
  }

  post(endpoint: string, data: any): Observable<any> {
    return this.http.post<any>(
      "http://" + window.location.hostname + ":3000" + endpoint,
      data
    );
  }
}
