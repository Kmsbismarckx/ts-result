# @bismarckx/ts-result

> Short description of what this package does.

## Install

```bash
npm install @bismarckx/ts-result
```

## Usage

```typescript
import { myUtil } from "@bismarckx/ts-result;
```

## Contributing

### Development

```bash
npm run dev        # watch mode
npm run typecheck  # type check without emitting
npm run build      # production build → dist/
```

### Releasing

This package uses [Changesets](https://github.com/changesets/changesets) for versioning.

```bash
# 1. After making changes — describe what changed
npm run cs

# 2. On merge to main — CI creates a "Version Packages" PR automatically
# 3. Merge that PR → CI publishes to npm
```

## License

MIT
