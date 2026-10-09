import { ControlsSection } from './sections/ControlsSection';
import { DataSection } from './sections/DataSection';
import { FoundationsSection } from './sections/FoundationsSection';
import { OverlaysSection } from './sections/OverlaysSection';
import { SurfacesSection } from './sections/SurfacesSection';

export function ComponentsPage() {
  return (
    <main className="mx-auto grid max-w-300 gap-2 px-4 pt-2 pb-16 lg:px-6">
      <FoundationsSection />
      <ControlsSection />
      <DataSection />
      <SurfacesSection />
      <OverlaysSection />
    </main>
  );
}
