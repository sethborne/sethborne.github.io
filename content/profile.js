// Name and contact links, used by the header, footer and the About &
// contact section. Plain data, like site.js.
//
// Each link has an id; content/about.js (contact.links) picks them by id.
// pending(id, label) is a link that isn't live yet: it renders with
// href="#" and data-placeholder="<id>" so it's easy to find and swap.
// Replace it with {id, label, href} once the real link exists:
//   email:    href: 'mailto:you@example.com'
//   linkedin: href: 'https://www.linkedin.com/in/…'
//   resume:   href: 'docs/seth_borne_resume.pdf'

const pending = (id, label) => ({id, label, href: '#', pending: true});

export default {
  name: 'Seth Borne',
  links: [
    pending('email', 'Email'),
    {id: 'github', label: 'GitHub', href: 'https://github.com/sethborne'},
    pending('linkedin', 'LinkedIn'),
    pending('resume', 'Resume'),
    {
      id: 'repo',
      label: 'Repo',
      href: 'https://github.com/sethborne/sethborne.github.io',
    },
  ],
};
