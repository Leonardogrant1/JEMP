import fetch from 'node-fetch';
import { AppStoreLookupResponse } from '../types';

export async function fetchIosVersionInfo(bundleId: string) {
  const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}`;
  const res = await fetch(url);
  const json = await res.json() as AppStoreLookupResponse;

  const result = json.results?.[0];
  if (!result) throw new Error("App not found");

  return {
    version: result.version, // z.B. "3.2.0"
    releaseNotes: result.releaseNotes, // z.B. "What's new"
  };
}

 