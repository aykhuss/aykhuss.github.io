# Personal-site migration to al-folio v1

## Reference points

- Personal site before migration: `c15fa28` on `master`.
- Exact original template: `a21bd492` (its tree matches local initial commit `3803cfc`).
- Target: upstream `main` at `f2a2765c8a9413f6ec703fc02070fbe6becf1572`.
- Working branch: `upgrade/al-folio-v1`. Nothing has been pushed or deployed.
- This is a content-aware migration to the v1 starter, not a blind merge of unrelated Git histories.

## Preserved

The bibliography, data files, JSON resume, profile image, biography, talks and teaching sources are unchanged.
The six navigation destinations and their order are unchanged. Blue accent, 800px content width,
circular portrait, non-fixed footer, disabled dark mode and hidden example pages remain intentional settings.

The content test baseline was recorded from a successful build of the **old** site, not from the migrated output.
It checks biography/talks/teaching text and links, all 103 publication titles and their order,
navigation, canonical URLs, social links, CV content and referenced local assets.
A route comparison also found no removed HTML destinations.

## Runtime changes

- Adopted the current upstream Gemfile/plugin pins, lockfile, configuration contract and deployment/build tooling.
- Removed old copied layouts, scripts, plugins, Sass and icon fonts now supplied by gems.
- Moved social identifiers into `_data/socials.yml`. INSPIRE is now natively supported.
- Kept JSONResume as the CV source using `cv_format: jsonresume`; the old YAML CV is retained but not displayed.
- Updated the blog, projects and repositories presentation to current templates without importing new demo entries.
- Preserved `/blog/` while moving its index into `_pages/blog.md`.
- Three small media include adapters (`figure.html`, `audio.html`, `video.html`) delegate to current gem includes,
  allowing existing posts/projects to remain unchanged.
- Migrated the original Mermaid example to the current fenced-code renderer; the old diagrams plugin was removed.
- Retained legacy Bootstrap compatibility for existing table/project markup. Upstream supports it through v1.2,
  deprecates it in v1.3 and removes it in v2.0. Four audit advisories identify old table `data-toggle` attributes.
- Global search is installed but disabled: upstream would otherwise index the retained sample posts/projects/news.
  Publication filtering remains enabled. No sample content has been deleted.
- CI checks content preservation and upgrade contracts before publishing. Actions are pinned to commits.
  Redundant global PurgeCSS execution was removed: plugin CSS is already minified and dynamically created classes
  should not be stripped by a second pipeline. npm dependencies have no reported audit vulnerabilities.

## Intentional styling override

`_sass/_themes.scss` is based on `al_folio_core` 1.0.15 and tracked in `.al-folio-overrides.yml`.
It preserves the blue accent, expresses two alpha colors with equivalent `sass:color` calls that lint correctly,
and fixes Bootstrap compatibility hiding the desktop menu (`visibility: hidden` on `.collapse`).
A browser regression test failed on the hidden menu before that fix and passes afterward.

Review this override after updating the core gem; do not restore old theme directories wholesale.

## Approved CV presentation

The owner approved retaining the updated layout while preserving the original contact/date presentation.
Three overrides based on `al_folio_cv` 1.0.2 are tracked in `.al-folio-overrides.yml`:

- `_includes/cv/experience.liquid` and `_includes/cv/education.liquid` retain supplied months as `YYYY.MM`.
  The Durham appointment remains `2020.01 - 2020.09`, open-ended appointments show `Present`,
  and year-only dates are not given invented months.
- `_includes/cv/render.liquid` restores clickable email and omits the postal-address row.
  This affects presentation only: the original JSON resume is unchanged and remains a public site asset,
  just as it was before the migration.

Content checks explicitly cover these decisions. All six desktop/mobile browser tests pass, including CV
presentation, navigation, local assets and absence of horizontal overflow. The production build and upgrade
checks pass; the four legacy Bootstrap advisories described above remain non-blocking.
Review all four tracked overrides (three CV includes and the stylesheet) after future gem updates.

## Verification and local use

Prerequisites: Ruby/Bundler (lockfile uses Bundler 4.0.6), Node, ImageMagick, Python with `nbconvert`.
The local machine has Ruby 3.2.2; CI follows upstream Ruby 3.3.5.

```sh
bundle install
npm ci
JEKYLL_ENV=production bundle exec jekyll build
bundle exec ruby test/site_content.rb
bundle exec al-folio upgrade audit
bundle exec al-folio upgrade overrides audit
npx playwright install chromium
npm run test:visual
bundle exec jekyll serve
```

This is a personal GitHub Pages site: **leave `baseurl` empty**. Local preview is at `http://localhost:4000/`.
Upstream documentation and upstream demo-specific tests refer to `/al-folio`; that prefix does not apply here.
The upstream style-contract test also intentionally rejects directories that are legal overrides in personal sites.
Use the site-specific content/browser tests above, not the upstream demo's visual suite.

For intentional content edits, rebuild, run `bundle exec ruby test/site_content.rb --record`, and review the fixture diff.
Do not re-record snapshots just to hide an unexplained preservation failure.

The pre-migration build initially failed because the machine's Jupyter executable pointed to a removed Python version.
Validation used a temporary isolated Python environment; no global Python installation was changed.
Playwright's installer stalled during extraction under the local Node version; its downloaded Chromium archive
was extracted in a temporary directory and the tests used `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to select it.
Docker and the remote GitHub Actions deployment have not been executed locally.
