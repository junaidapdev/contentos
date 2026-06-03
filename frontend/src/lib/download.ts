// Triggers a client-side download of `content` as a markdown file named `filename`. Pure-DOM:
// builds a Blob, creates a temporary object URL, clicks a synthetic anchor, and revokes the URL
// immediately so nothing leaks. No network round-trip — the pack never leaves the user's machine.
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
