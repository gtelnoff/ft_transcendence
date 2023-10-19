import { TestBed } from '@angular/core/testing';

import { LogCheckService } from './log-check.service';

describe('LogCheckService', () => {
  let service: LogCheckService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LogCheckService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
