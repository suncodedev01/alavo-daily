import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ModuleManifest } from '@alavo-daily/common';

import { ModuleBackgrounds } from './ModuleBackgrounds';
import { ModulesProvider } from './ModulesProvider';

function manifest(id: string, background?: ModuleManifest['background']): ModuleManifest {
  return { id, name: id, icon: 'star', description: '', views: [], routes: [], background };
}

describe('ModuleBackgrounds', () => {
  it('mounts the background of every module that has one', () => {
    const modules = [
      manifest('alpha', () => <p>alpha is running</p>),
      manifest('plain'),
      manifest('beta', () => <p>beta is running</p>),
    ];
    render(
      <ModulesProvider modules={modules}>
        <ModuleBackgrounds />
      </ModulesProvider>,
    );
    expect(screen.getByText('alpha is running')).toBeInTheDocument();
    expect(screen.getByText('beta is running')).toBeInTheDocument();
  });

  it('renders nothing when no module has a background', () => {
    const { container } = render(
      <ModulesProvider modules={[manifest('plain')]}>
        <ModuleBackgrounds />
      </ModulesProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
