import { dashboardMessages } from './messages';

// Placeholder dashboard — Chunk 04 fills this with the first real view (content item list).
export function DashboardPlaceholder() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{dashboardMessages.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{dashboardMessages.body}</p>
    </div>
  );
}
