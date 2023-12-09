# Configuration

A `observablehq.config.js` (or `observablehq.config.ts`) file allows you to configure certain aspects of the project. The following optional configuration options are supported:

- **title** - the project’s title
- **pages** - the website hierarchy
- **toc** - configuration for the table of contents

If a **title** is specified, it is used as text to describe the link to the home page in the sidebar (for a multipage project), and to complement the titles of the webpages. For instance, a page titled _“Sales”_ in a project titled _“ACME, Inc.”_ will display _“Sales | ACME, Inc.”_ in the browser’s title bar.

The **pages** option is an array containing pages—described by a name and a path starting from the root— and sections—described by a name and a similar array of pages—, creating a website hierarchy. It defaults to the list of markdown files found in the project’s docs, in alphanumerical order, followed by pages found in subdirectories.

The **toc** option is an object describing the generation of the table of contents on each page. It supports the following options:

- **show** - a boolean which defaults to false
- **label** - the table of contents’s header

Both these options can also be set in the page’s front-matter, which takes precedence on the global setting. If **show** is true, and the page contains H2 headings (created for example with a line containing `## Section name`), a table of contents is generated from all the headings, and displayed on the right-hand side of the page.
