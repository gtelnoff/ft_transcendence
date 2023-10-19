import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class LogCheckService {
  isLogged: boolean = false;
  constructor() {}
}
