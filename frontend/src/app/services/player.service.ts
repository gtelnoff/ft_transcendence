import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { BackendService } from './backend.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  constructor(private backendService:BackendService) { }

  async getPlayerInfos()
  {
    const returnValue = await lastValueFrom(this.backendService.get("/player/infosPlayer"));
    return (returnValue)
  }
}
