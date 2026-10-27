// Umami-Tracker — wird im Root-Layout per Script-Tag geladen (nur Production)
interface Window {
  umami?: {
    track: (event: string, data?: Record<string, string | number>) => void;
  };
}
