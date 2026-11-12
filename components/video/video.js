// Video on the page (a section's or content's `video`, from video() in
// content/helpers.js): the poster with a big play button. A click swaps
// in the <video>, which plays with sound and the browser's own controls
// (play, scrub, volume, fullscreen), and moves focus onto it so the
// keyboard keeps working. Nothing loads but the poster until the click.
// For a movie that stands alone; short loops are gallery video items.
import {el} from '../../js/dom.js';
import {fallbackFor, srcsetFor} from '../../js/images.js';

export const createVideo = ({title, video}) => {
  const {base, name, width, posterWidths, aspect} = video;
  const poster = {base: `${base}${name}_poster`, widths: posterWidths};
  const src = `${base}${name}_${width}.mp4`;

  const start = el(
    'button',
    {type: 'button', class: 'video-start', 'aria-label': `Play ${title}, with sound`},
    el('span', {class: 'video-play', 'aria-hidden': 'true'}),
  );
  const frame = el(
    'div',
    {class: 'video-frame', style: `aspect-ratio: ${aspect}`},
    // Decorative: the button names the video
    el('img', {class: 'video-poster', src: fallbackFor(poster), srcset: srcsetFor(poster), sizes: '(min-width: 1080px) 1032px, 100vw', alt: '', loading: 'lazy', decoding: 'async'}),
    start,
  );

  start.addEventListener('click', () => {
    const player = el('video', {class: 'video-player', src, poster: fallbackFor(poster), controls: true, playsinline: true, preload: 'auto', 'aria-label': title});
    frame.replaceChildren(player);
    player.play().catch(() => {});
    player.focus();
  });

  return el('figure', {class: 'video'}, frame);
};
