import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/index';
import './showcase.css';
import { AppDemo } from './AppDemo';
import { Chrome } from './Chrome';
import { ComponentsPage } from './ComponentsPage';
import { MobileDemo } from './MobileDemo';
import { readQuery, applyTheme } from './query';

const query = readQuery();
applyTheme(query.theme);

const PAGES = {
  chrome: Chrome,
  components: ComponentsPage,
  app: AppDemo,
  mobile: MobileDemo,
};

const Page = PAGES[query.view];

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Page />
    <Toaster />
  </StrictMode>,
);
