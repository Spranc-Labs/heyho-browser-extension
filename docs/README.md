# HeyHo Browser Extension Documentation

This directory contains technical documentation for the HeyHo browser extension, including feature implementations, architecture decisions, and development guides.

## Structure

```
docs/
├── README.md                          # This file
├── categorization/                    # Page visit categorization system
│   ├── 00-overview.md                # High-level overview
│   ├── 01-metadata-extraction.md     # How we extract page metadata
│   ├── 02-categorization-rules.md    # Categorization logic
│   ├── 03-implementation-plan.md     # Step-by-step implementation
│   └── 04-examples.md                # Real-world examples
└── architecture/                      # General architecture docs (future)
```

## Quick Links

### Categorization System
- [Overview](./categorization/00-overview.md) - What is page categorization and why?
- [Metadata Extraction](./categorization/01-metadata-extraction.md) - Technical details
- [Categorization Rules](./categorization/02-categorization-rules.md) - How pages are categorized
- [Implementation Plan](./categorization/03-implementation-plan.md) - How to implement
- [Examples](./categorization/04-examples.md) - Real-world examples

## Document Updates

When adding new features or making significant changes to the browser extension:

1. **Create/Update Documentation** in this `docs/` folder
2. **Follow the naming convention**: `NN-descriptive-name.md` (where NN is a number for ordering)
3. **Include**:
   - Overview/motivation
   - Technical details
   - Code examples
   - Implementation steps
   - Testing approach
4. **Link from this README** for easy discovery

## Contributing

When documenting:
- Use clear, concise language
- Include code examples
- Add diagrams for complex flows (use Mermaid or ASCII)
- Keep docs up-to-date with code changes
- Follow the existing structure and style

## Style Guide

- Use Markdown
- Use `code blocks` for code snippets
- Use **bold** for emphasis
- Use _italics_ for technical terms on first use
- Include file paths like: `src/background/events.js:42`
- Keep lines under 100 characters when possible
