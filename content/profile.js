// Name and contact links, used by the header, footer and the About &
// contact section. Plain data, like site.js.
//
// Each link has an id; content/about.js (contact.links) picks them by id.
// pending(id, label) is a link that isn't live yet: it renders with
// href="#" and data-placeholder="<id>" so it's easy to find and swap.
// Replace it with {id, label, href} once the real link exists.

const pending = (id, label) => ({id, label, href: '#', pending: true});

export default {
  name: 'Seth Borne',
  links: [
    // +portfolio still lands in the main inbox (Gmail ignores what's
    // after the +), so a filter can label site mail even if the sender
    // edits the subject. The subject is prefilled, %20 = space.
    {
      id: 'email',
      label: 'Email',
      href: 'mailto:sethborne+portfolio@gmail.com?subject=Hello%20from%20your%20portfolio',
    },
    {id: 'github', label: 'GitHub', href: 'https://github.com/sethborne'},
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/sethborne/',
    },
    {id: 'resume', label: 'Resume', href: 'docs/resume/seth_borne_resume_general.pdf'},
    {
      id: 'repo',
      label: 'Repo',
      href: 'https://github.com/sethborne/sethborne.github.io',
    },
  ],
};
