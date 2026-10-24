import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // Relative URLs only — the Angular dev-server proxy (proxy.conf.json) and
  // any production reverse proxy forward /api to the backend. The browser
  // never calls localhost directly, so the hosted preview works.
  health() { return this.http.get<any>('/api/health'); }
  identity() { return this.http.get<any>('/api/identity'); }
  entropy() { return this.http.get<any>('/api/entropy'); }
  torStatus() { return this.http.get<any>('/api/tor/status'); }
  connectors() { return this.http.get<any>('/api/connectors'); }
  voiceStatus() { return this.http.get<any>('/api/voice/status'); }
  check(body: { url: string; viaTor: boolean; method: string }) { return this.http.post<any>('/api/check', body); }
}
