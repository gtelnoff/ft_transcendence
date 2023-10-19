import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
  providedIn: "root",
})
export class SnackbarService {
  constructor(private snackbar: MatSnackBar) {}

  error(message: string) {
    return this.snackbar.open(message, undefined, {
      panelClass: ["snackbar-error"],
      duration: 10000,
    });
  }

  success(message: string) {
    return this.snackbar.open(message, undefined, {
      panelClass: ["snackbar-success"],
      duration: 10000,
    });
  }

  info(message: string) {
    return this.snackbar.open(message, undefined, {
      panelClass: ["snackbar-info"],
      duration: 10000,
    });
  }
}
