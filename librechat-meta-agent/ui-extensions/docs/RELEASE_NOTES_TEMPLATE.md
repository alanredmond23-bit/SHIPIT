# Release Notes Template

Use this template when creating release notes for new versions of Mission Control.

---

## Template

```markdown
# Mission Control vX.Y.Z Release Notes

**Release Date**: YYYY-MM-DD
**Release Type**: Major / Minor / Patch
**Compatibility**: Breaking / Non-breaking

---

## Highlights

<!-- 2-3 sentence summary of the most important changes -->

This release introduces [main feature]. Additionally, [secondary improvement] and [bug fixes or polish].

---

## New Features

### Feature Name

<!-- Description of the feature, why it matters, and how to use it -->

**What**: Brief description of the feature.

**Why**: The problem it solves or value it provides.

**How to use**:
1. Step one
2. Step two
3. Step three

<!-- Optional: Include a screenshot or code example -->

---

### Feature Name 2

...

---

## Improvements

<!-- List improvements to existing features -->

- **Component/Area**: Description of improvement
- **Component/Area**: Description of improvement
- **Component/Area**: Description of improvement

---

## Bug Fixes

<!-- List bugs that were fixed -->

- Fixed issue where [description of bug] (#issue-number)
- Resolved [description of bug] (#issue-number)
- Corrected [description of bug] (#issue-number)

---

## Performance

<!-- List performance improvements if any -->

- Reduced [metric] by X%
- Improved [operation] speed by Xms
- Optimized [component] memory usage

---

## Breaking Changes

<!-- List any breaking changes - IMPORTANT for major versions -->

### Change Name

**Before**:
```javascript
// Old way of doing something
oldFunction(param1, param2);
```

**After**:
```javascript
// New way of doing something
newFunction({ param1, param2 });
```

**Migration**: Describe how to update existing code.

---

## Deprecations

<!-- List features that are deprecated but still work -->

- `oldFunction()` is deprecated and will be removed in vX.0.0. Use `newFunction()` instead.
- The `legacyProp` prop is deprecated. Use `newProp` instead.

---

## Security

<!-- List security-related changes -->

- Updated [dependency] to address CVE-XXXX-XXXXX
- Improved [security measure]
- Fixed [security issue]

---

## Dependencies

### Updated

- `package-name`: X.Y.Z -> A.B.C
- `package-name`: X.Y.Z -> A.B.C

### Added

- `new-package`: X.Y.Z - [reason for adding]

### Removed

- `old-package` - [reason for removal]

---

## Known Issues

<!-- List known issues that weren't fixed in this release -->

- Description of known issue (#issue-number)
- Description of known issue (#issue-number)

---

## Upgrade Guide

### From vX.Y.Z

1. Update dependencies: `npm install`
2. [Step for any required changes]
3. [Step for any required changes]
4. Restart the development server

### From vA.B.C (Older version)

If upgrading from a version older than X.Y.Z, please also follow the upgrade guides for intermediate versions.

---

## Contributors

Thanks to everyone who contributed to this release:

- @contributor1 - Feature X
- @contributor2 - Bug fix Y
- @contributor3 - Documentation improvements

---

## Full Changelog

For a complete list of changes, see the [CHANGELOG.md](../CHANGELOG.md) or compare versions on GitHub.

---

## Feedback

We'd love to hear your feedback on this release:

- Open an issue on GitHub
- Join our Discord community
- Tweet us @project

---

*Next release planned: [date or version]*
```

---

## Guidelines

### Version Numbers

Follow [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes, major new features
- **Minor (0.X.0)**: New features, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, minor improvements

### Writing Style

1. **Be concise**: Use clear, simple language
2. **Be specific**: Include version numbers, file names, and code examples
3. **Be actionable**: Tell users what they need to do
4. **Be positive**: Focus on improvements, not just fixes

### Checklist Before Release

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number bumped in package.json
- [ ] Release notes written
- [ ] Security review completed
- [ ] Performance benchmarks run
- [ ] Breaking changes documented with migration guide

### Where to Publish

1. **GitHub Releases**: Create a new release with these notes
2. **CHANGELOG.md**: Update the changelog file
3. **Documentation site**: Update if applicable
4. **Social media**: Announce major releases

---

## Example Release Notes

See below for a filled-in example:

---

# Mission Control v1.1.0 Release Notes

**Release Date**: 2026-02-15
**Release Type**: Minor
**Compatibility**: Non-breaking

---

## Highlights

This release introduces Team Workspaces for collaborative AI conversations. We've also improved streaming performance by 40% and fixed several accessibility issues.

---

## New Features

### Team Workspaces

Collaborate with your team in shared AI workspaces.

**What**: Create shared workspaces where multiple team members can participate in AI conversations together.

**Why**: Teams often need to collaborate on complex problems. Now you can brainstorm, research, and make decisions together with AI assistance.

**How to use**:
1. Navigate to Settings > Workspaces
2. Click "Create Workspace"
3. Invite team members via email
4. Start a conversation in the shared workspace

---

## Improvements

- **Chat**: Improved message loading performance for long conversations
- **Research**: Added citation export in BibTeX format
- **Personas**: Added 10 new pre-built personas for common use cases
- **Mobile**: Better touch targets on mobile devices

---

## Bug Fixes

- Fixed issue where messages would occasionally duplicate (#234)
- Resolved streaming cutoff on slow connections (#245)
- Corrected keyboard navigation in model selector (#251)

---

## Performance

- Reduced initial page load by 200ms
- Improved streaming response latency by 40%
- Optimized image generation preview rendering

---

## Dependencies

### Updated

- `@anthropic-ai/sdk`: 0.71.2 -> 0.73.0
- `next`: 14.1.0 -> 14.2.0

---

## Upgrade Guide

### From v1.0.x

1. Run `npm install` to update dependencies
2. Clear browser cache for best results
3. No code changes required

---

## Contributors

Thanks to our contributors:

- @alice - Team Workspaces feature
- @bob - Performance improvements
- @carol - Accessibility fixes

---

*Next release planned: March 2026*
