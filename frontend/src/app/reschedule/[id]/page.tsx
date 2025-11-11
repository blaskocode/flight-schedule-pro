// Server component wrapper for static export
import ReschedulePageClient from './ReschedulePageClient';

// Required for static export with dynamic routes
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  // Return placeholder - actual routing is handled client-side
  // This satisfies Next.js static export requirement
  return [{ id: 'placeholder' }];
}

export default function ReschedulePage() {
  return <ReschedulePageClient />;
}

