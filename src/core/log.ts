import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export interface Incident {
  timeIso: string;
  requestId: string;
  ip?: string;
  method: string;
  path: string;
  query: string;
  userAgent: string;
  verdict: string;
  mode: string;
  score: number;
  signals: string[];
}

export function logIncident(file: string | undefined, incident: Incident): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(incident) + '\n', 'utf8');
  } catch {
    // logging must never break the request path
  }
}

export function readIncidents(file: string): Incident[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Incident;
      } catch {
        return null;
      }
    })
    .filter((x): x is Incident => x !== null);
}
