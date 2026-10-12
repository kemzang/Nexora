/**
 * Sources de documentation indexees.
 *
 * On part des depots GitHub plutot que des sites : la documentation y est en
 * Markdown, structuree et versionnee, alors qu'un site demande du crawl, du
 * nettoyage HTML, et pose la question des conditions d'utilisation.
 *
 * `include` limite le parcours aux dossiers qui contiennent de la
 * documentation : les depots embarquent aussi du code, des tests et des
 * traductions, qui n'ont rien a faire dans l'index.
 */
export const SOURCES = [
  {
    id: 'react',
    label: 'React',
    repo: 'reactjs/react.dev',
    ref: 'main',
    include: ['src/content/learn/', 'src/content/reference/'],
    // react.dev sert /learn/... et /reference/... ; on reconstruit l'URL
    // publique pour pouvoir citer la source a l'utilisateur.
    url: (p) => `https://react.dev/${p.replace(/^src\/content\//, '').replace(/\.md$/, '')}`,
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    repo: 'vercel/next.js',
    ref: 'canary',
    include: ['docs/'],
    url: (p) =>
      `https://nextjs.org/docs/${p
        .replace(/^docs\//, '')
        .replace(/\.mdx?$/, '')
        // les dossiers numerotes (01-app, 02-pages) ne figurent pas dans l'URL
        .split('/')
        .map((s) => s.replace(/^\d+-/, ''))
        .join('/')}`,
  },
]
