// Site header: name, home section links, mobile menu toggle.
// Fills the existing <header> and returns {setRoute} for app.js.
import {el} from '../../js/dom.js';

// Header gets its background once the page scrolls past this.
const SCROLLED_AT = 40;

// The hero's id; its nav link goes to #/ rather than #/home.
const HOME_SECTION = 'home';

// Node and filter routes are project pages, so they light up this link.
const PROJECTS_SECTION = 'projects';

const capitalize = (id) => id[0].toUpperCase() + id.slice(1);

// labels: optional nav text per id, e.g. {about: 'About & contact'}
export const createHeader = (root, {name, sections, labels = {}}) => {
  const label = (id) => labels[id] ?? capitalize(id);
  // Home first, then one link per home section
  const navItems = [
    {id: HOME_SECTION, href: '#/'},
    ...sections.map((id) => ({id, href: `#/${id}`})),
  ];
  const links = navItems.map(({id, href}) =>
    el('a', {href, 'data-section': id}, label(id)),
  );
  const list = el(
    'ul',
    {class: 'nav-links', id: 'navLinks'},
    links.map((link) => el('li', {}, link)),
  );
  const toggle = el(
    'button',
    {
      class: 'nav-toggle',
      type: 'button',
      'aria-label': 'Toggle menu',
      'aria-controls': 'navLinks',
      'aria-expanded': 'false',
    },
    el('span'),
    el('span'),
    el('span'),
  );

  root.replaceChildren(
    el(
      'div',
      {class: 'nav-inner'},
      el('a', {href: '#/', class: 'nav-name'}, name),
      toggle,
      list,
    ),
  );

  // Compact on scroll
  const onScroll = () =>
    root.classList.toggle(
      'is-scrolled',
      window.scrollY > SCROLLED_AT,
    );
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();

  const isMenuOpen = () => list.classList.contains('open');

  const setOpen = (open) => {
    list.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  // event listeners
  // open/close nav on click
  toggle.addEventListener('click', () => setOpen(!isMenuOpen()));

  // delegate event for list items, when link clicked, menu closes
  list.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      setOpen(false);
    }
  });

  // Escape closes the menu. If focus was on a menu link (about to be
  // hidden), move it to the toggle. Mouse clicks never leave focus behind
  // (see app.js), so this only happens for keyboard users.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen()) {
      const focusWasInMenu = list.contains(document.activeElement);
      setOpen(false);
      if (focusWasInMenu) toggle.focus();
    }
  });

  // Highlight the link for the section in view (null clears it)
  const setActive = (id) => {
    for (const link of links) {
      const isActive = link.dataset.section === id;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  // A section counts as "in view" while it crosses a band near the top
  // of the window. The hero is watched too, so scrolling back up
  // highlights Home. Sections that aren't built yet are skipped.
  let onHome = true;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!onHome) return;
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    },
    {rootMargin: '-30% 0px -60% 0px'},
  );
  for (const id of [HOME_SECTION, ...sections]) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }

  const setRoute = (route) => {
    // Any navigation closes the menu: nav links, the name, hero buttons,
    // browser Back/Forward.
    setOpen(false);
    onHome = route.view === 'home';
    if (!onHome) setActive(PROJECTS_SECTION);
    else setActive(route.section ?? HOME_SECTION);
  };

  return {setRoute};
};
