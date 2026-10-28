// Name and contact links, used by the header and footer (and later the
// Contact section). Plain data, like site.js.
//
// pending(label, placeholder) is a link that isn't live yet: it renders
// with href="#" and data-placeholder="<placeholder>" so it's easy to
// find and swap. Replace it with {label, href} once the real link exists.

const pending = (label, placeholder) => ({label, href: '#', placeholder});

export default {
  name: 'Seth Borne',
  links: [
    pending('Email', 'email'),
    {label: 'GitHub', href: 'https://github.com/sethborne'},
    pending('LinkedIn', 'linkedin'),
    pending('Resume', 'resume'),
    {
      label: 'Repo',
      href: 'https://github.com/sethborne/sethborne.github.io',
    },
  ],
};
