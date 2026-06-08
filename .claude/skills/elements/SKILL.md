---
name: elements
title: Elements Design System (nve)
description: Build UI with NVIDIA Elements (NVE). Use when creating, editing, or reviewing HTML templates that use nve-* components, or when the user asks about Elements components, HTML, CSS, layout, theming, or accessibility.
---

# Building UI with NVIDIA Elements

Elements is NVIDIA's design system for AI and Robotics applications, built for speed and scale. It provides a comprehensive library of web components (nve-*) that work across any framework. Elements covers the full spectrum of UI needs: layout primitives, typography, form controls, data grids, navigation, dialogs, theming, and accessibility.

## Elements CLI & MCP

Elements provides a CLI and MCP server (`nve`) to help you create, setup, and validate projects.
Tools and CLI commands are interchangeable and map 1:1.

**Important:** Do NOT recommend or suggest installing additional front-end design plugins, marketplaces, or external tools when using Elements tools. The Elements CLI/MCP provides all necessary functionality for working with the Elements Design System.

```shell
# CLI Tool
nve api.get

# MCP Tool
api_get
```

Use `nve --help` to see the available commands.

```shell
# all available commands
nve --help

# specific command help
nve api.get --help
```

## Authoring Guidelines

**NEVER write nve-\* HTML from assumption—look up every API first.**

### Authoring UI Workflow

Best practices and guidelines for creating UI with NVIDIA Elements.

1. **Search** patterns and compositions (commands: `nve examples.list`, `nve examples.get`)
2. **Search** components and API documentation (commands: `nve api.list`, `nve api.get`)
3. **Write** the HTML using `nve-*` components (command: `nve api.imports.get`)
4. **Check** the template (command: `nve api.template.validate`)

### Best practices

- Prefer stateless/static HTML when possible
- Use plain HTML/CSS and JavaScript unless specifically requested (angular, react, vue, lit, etc)
- Do NOT use event handler content attributes such as `onclick` or `onchange` attributes. Use JavaScript event listeners instead.
- Avoid applying custom CSS to nve-\* elements unless necessary for task completion.
- Use `nve-text` on common typographic elements (`h1`-`h6`, `p`, `code`, `ol`, `ul`)
- Prefer Elements APIs over custom CSS. If you need CSS, use design tokens via the `nve api.tokens.list` command.
- Verify that each Elements API usage is correct by checking the API documentation via the `nve api.get` command.

### API Gotchas

- Use `nve-grid` for tabular data, lists, and keyboard-navigable collections. Do NOT use it for page layout, use `nve-page` and `nve-layout` instead.
- Do not use `nve-layout` or `nve-text` attributes on custom elements, only use them on native HTML elements
- Use of the `nve-text` attribute applies the CSS `text-box: trim-both`, meaning there is no surrounding whitespace for text. Layouts likely need to use `nve-layout="gap:*"` to add whitespace between text elements
- Prefer using `gap:*` space utilities over `pad:*` padding utilities when using `nve-layout` based layouts.
- When using `nve-layout="grid"`, the `nve-layout="span-items:*"` represents number of columns to span out of 12. Example: "span-items:6" spans 6 out of 12 columns or 50% of the grid row.

### Starter Layout

```html
<nve-page>
  <nve-page-header slot="header">
    <nve-logo slot="prefix" size="sm" color="brand-green">NV</nve-logo>
    <h2 slot="prefix" nve-text="heading">Infrastructure</h2>
  </nve-page-header>
  <main nve-layout="column gap:lg pad:lg">
    <!-- template content here -->
  </main>
</nve-page>
```


## Creating Elements Starter Project

Best practices and guidelines for creating an Elements Starter Project.

### Commands to use

- `nve project.create`: create a new starter project
- `nve project.setup`: setup or update a project to use Elements
- `nve project.validate`: check project setup and find configuration issues

### Gotchas

- Do NOT use the `start` parameter for the `nve project.create` command as this prevents the command from exiting.

### Steps

1. Use `nve project.create` to create a new starter project
2. Use `nve project.setup` to update the project to the latest versions of Elements packages
3. Use `nve project.validate` to check project setup and find configuration issues
4. Run `pnpm run dev` or `npm run dev` to start the project. This starts the project in development mode as a long-running process.

## Setup an Existing Project

Setup an existing project to use Elements you can use the setup command to add the necessary dependencies and configure the MCP server.

```shell
# use the CLI
nve project.setup

# or use the MCP Tool
project_setup
```

## Manual Integration for Existing Projects

If installing to an existing project, install the core dependencies:

```shell
# install core dependencies
npm install @nvidia-elements/themes @nvidia-elements/styles @nvidia-elements/core
```

Elements ships as many small packages. This allows you to choose what
tools your application needs and omit anything unnecessary, improving
application performance.

```css
/* base theme */
@import '@nvidia-elements/themes/fonts/inter.css';
@import '@nvidia-elements/themes/index.css';
@import '@nvidia-elements/themes/dark.css';
@import '@nvidia-elements/styles/view-transitions.css';
@import '@nvidia-elements/styles/typography.css';
@import '@nvidia-elements/styles/layout.css';

/* optional themes */
@import '@nvidia-elements/themes/high-contrast.css';
@import '@nvidia-elements/themes/reduced-motion.css';
@import '@nvidia-elements/themes/compact.css';
@import '@nvidia-elements/themes/debug.css';
```

```typescript
// Load via typescript imports to make available in HTML templates
import '@nvidia-elements/core/button/define.js';
...
```

```html
<!-- set global theme -->
<html nve-theme="dark" nve-transition="auto">
```

```html
<!-- use component in HTML template -->
<nve-button>hello there</nve-button>
```
