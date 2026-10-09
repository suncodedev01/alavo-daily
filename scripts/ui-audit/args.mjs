const DEFAULTS = {
  url: 'http://localhost:5190',
  viewports: '360x640,390x844,1280x800',
  themes: 'light,dark',
  languages: 'vi,en',
  routes: '',
  concurrency: '2',
  maxRows: '80',
};

function parseViewport(text) {
  const [width, height] = text.split('x').map(Number);
  if (!width || !height) throw new Error(`Bad viewport "${text}", expected WIDTHxHEIGHT`);
  return { width, height, name: text };
}

function readFlags(argv) {
  const flags = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument "${arg}"`);
    const name = arg.slice(2).replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
    const isSwitch = ['headed', 'shots', 'allShots'].includes(name);
    flags[name] = isSwitch ? true : argv[(index += 1)];
  }
  return flags;
}

export function parseArgs(argv, defaultOut) {
  const flags = readFlags(argv);
  return {
    url: flags.url.replace(/\/$/, ''),
    viewports: flags.viewports.split(',').map(parseViewport),
    themes: flags.themes.split(','),
    languages: flags.languages.split(','),
    routeFilter: flags.routes,
    concurrency: Number(flags.concurrency),
    maxRows: Number(flags.maxRows),
    out: flags.out ?? defaultOut,
    headed: flags.headed === true,
    shots: flags.shots === true || flags.allShots === true,
    allShots: flags.allShots === true,
  };
}
