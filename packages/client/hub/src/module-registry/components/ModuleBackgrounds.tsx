import { useModules } from '../hooks/useModules';

export function ModuleBackgrounds() {
  const modules = useModules();
  return (
    <>
      {modules.map(({ id, background: Background }) => (Background ? <Background key={id} /> : null))}
    </>
  );
}
