import { readFileSync } from 'node:fs';

import { Resvg } from '@resvg/resvg-js';

const ART_SIZE = 1024;

export function renderSvg(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

function innerOf(path) {
  const svg = readFileSync(path, 'utf8');
  return svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
}

export function composeLayers(paths, { scale = 1, cornerRadius = 0 } = {}) {
  const center = ART_SIZE / 2;
  const content = paths.map(innerOf).join('\n');
  const shape = `<clipPath id="icon-shape"><rect width="${ART_SIZE}" height="${ART_SIZE}" rx="${cornerRadius}"/></clipPath>`;
  const placed = `<g transform="translate(${center} ${center}) scale(${scale}) translate(${-center} ${-center})">${content}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_SIZE} ${ART_SIZE}"><defs>${shape}</defs><g clip-path="url(#icon-shape)">${placed}</g></svg>`;
}
