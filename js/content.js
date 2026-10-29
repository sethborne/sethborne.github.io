// Content tree: load content/site.js and answer lookups against it.
// Everything here is pure except loadContent.

export const isLeaf = (node) => !node.children?.length;

// Nodes from the root down to the target, e.g. for a breadcrumb.
// [] -> [root]; null if any part of the path doesn't exist.
export const findTrail = (tree, path) => {
  const trail = [tree];
  for (const id of path) {
    const next = trail
      .at(-1)
      .children?.find((child) => child.id === id);
    if (!next) return null;
    trail.push(next);
  }
  return trail;
};

export const findNode = (tree, path) =>
  findTrail(tree, path)?.at(-1) ?? null;

// Every leaf under node, each with its full path from the root:
//   [{ node: <eb-external>, path: ['survey-map', 'eb-external'] }, ...]
// Pass the node's own path when starting below the root, e.g.
//   collectLeaves(findNode(tree, ['capstone']), ['capstone'])
export const collectLeaves = (node, path = []) => {
  if (isLeaf(node)) {
    return [{node, path}];
  }
  // has children: ask for leaves, then join the answers
  return node.children.flatMap((child) =>
    collectLeaves(child, [...path, child.id]),
  );
};

// A filter query with only tags that exist in the tree (tree.tags is the
// union of every leaf's tags). Drops typos and stale links, and empty
// facets, so {} means "no filter":
//   cleanQuery({tool: ['survey123', 'nope'], type: []}, tree.tags, ['tool', 'type'])
//   -> {tool: ['survey123']}
export const cleanQuery = (query, tags, facets) =>
  Object.fromEntries(
    facets
      .map((facet) => [
        facet,
        (query[facet] ?? []).filter((id) => tags[facet]?.includes(id)),
      ])
      .filter(([, ids]) => ids.length > 0),
  );

// Leaves matching a cleaned query: any listed value within a facet (OR),
// and every listed facet (AND).
//   {tool: ['survey123', 'node-js'], type: ['form']}
//   -> (Survey123 or Node.js) and a form
export const filterLeaves = (tree, query) =>
  collectLeaves(tree).filter(({node}) =>
    Object.entries(query).every(([facet, ids]) =>
      ids.some((id) => node.tags?.[facet]?.includes(id)),
    ),
  );

// iterative
// export const collectLeaves = (node, path = []) => {
//   const leaves = [];
//   const stack = [{node, path}];
//   while (stack.length) {
//     const item = stack.pop();
//     if (isLeaf(item.node)) {
//       leaves.push(item);
//     } else {
//       for (const child of [...item.node.children].reverse()) {
//         stack.push({node: child, path: [...item.path, child.id]});
//       }
//     }
//   }
//   return leaves;
// };

// Per facet, every value found on any leaf, without duplicates.
const unionTags = (leaves) =>
  leaves.reduce((tags, {node}) => {
    for (const [facet, values] of Object.entries(node.tags ?? {})) {
      tags[facet] = [...new Set([...(tags[facet] ?? []), ...values])];
    }
    return tags;
  }, {});

// Only leaves are tagged (content/projects/). Returns a new tree where each
// parent's tags are the union of its leaves' tags; the input is untouched.
export const withTags = (node) => {
  if (isLeaf(node)) return {...node};
  const children = node.children.map(withTags);
  const tags = unionTags(collectLeaves({...node, children}));
  return {...node, children, tags};
};

// Leaf tags that aren't tags.js exports, e.g. a string typed
// in by hand or an undefined from a bad spread:
//   ['survey-map/eb-external: "web-app"']
export const unknownTags = (tree, knownTags) =>
  collectLeaves(tree).flatMap(({node, path}) =>
    [node.tags ?? []]
      .flat()
      .filter((tag) => !knownTags.has(tag))
      .map((tag) => `${path.join('/')}: ${JSON.stringify(tag) ?? tag}`),
  );

// Leaves list their tags flat ([TOOL_SURVEY123, TYPE_FORM]); the rest of the
// app wants them by facet ({ tool: ['survey123'], type: ['form'] }).
// Unknown tags are dropped here, after unknownTags has warned about them.
export const groupTags = (node, knownTags) => {
  if (!isLeaf(node)) {
    const children = node.children.map((child) =>
      groupTags(child, knownTags),
    );
    return {...node, children};
  }
  const tags = {};
  for (const tag of [node.tags ?? []].flat()) {
    if (knownTags.has(tag)) {
      tags[tag.facet] = [...(tags[tag.facet] ?? []), tag.id];
    }
  }
  return {...node, tags};
};

// import() resolves against this module (js/), unlike fetch, which
// resolves against the page. Loading here, not with a top-level import,
// means a syntax error in site.js or any project file it imports is a
// caught error, not a dead app.
export const loadContent = async (
  siteUrl = '../content/site.js',
  tagsUrl = '../content/tags.js',
) => {
  const [{default: tree}, tagExports] = await Promise.all([
    import(siteUrl),
    import(tagsUrl),
  ]);
  const knownTags = new Set(Object.values(tagExports));
  const unknown = unknownTags(tree, knownTags);
  if (unknown.length) {
    console.warn('Unknown tags (use a constant from tags.js):', unknown);
  }
  return withTags(groupTags(tree, knownTags));
};
