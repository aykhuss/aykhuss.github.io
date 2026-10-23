# Personal website

Alexander Huß's website: <https://aykhuss.github.io>.

Built with [al-folio](https://github.com/alshedivat/al-folio) v1 and versioned Jekyll plugins.
See [the site migration notes](docs/SITE-MIGRATION.md) for preserved customizations, approved CV presentation and upgrade instructions.

```sh
bundle install
npm ci
bundle exec jekyll serve
```

Requires Ruby/Bundler, Node, ImageMagick and Python with `nbconvert`.
Preview at <http://localhost:4000/>. This personal site uses an empty `baseurl`, not `/al-folio`.

After building, run `npm run test:site` and `npm run test:visual` (requires Playwright Chromium).
The content snapshots were captured from the pre-migration site; review fixture changes when intentionally editing content.
