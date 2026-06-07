# LogicSet Launcher

Desktop utility for managing a modded Torchlight II multiplayer environment
focused on the LogicSet mod.

The project is currently an application foundation. V1 is focused on pre-game
environment setup, remote modpack updates, simple save management, and local
logging. Anti-desync features, save rollback, and advanced save parsing are not
part of V1.

V1 uses the stable LogicSet modpack manifest by default:
`https://raw.githubusercontent.com/Leon-nis/LogicSet-modpack/main/manifest.json`.
The URL remains editable in the Mod Update page for development and testing.

## Stack

- Electron
- React
- TypeScript
- Vite, through electron-vite

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Development

Install dependencies:

```bash
npm install
```

Start the Vite development server and Electron:

```bash
npm run dev
```

Other available commands:

```bash
npm run typecheck
npm run build
npm run preview
```

## Structure

```text
src/
|-- main/
|   |-- services/
|   `-- index.ts
|-- preload/
|   `-- index.ts
|-- renderer/
|   `-- src/
|       |-- components/
|       |-- pages/
|       `-- App.tsx
`-- shared/
    `-- types.ts
```

- `main` owns desktop lifecycle and future operating-system integrations.
- `preload` is the controlled bridge between Electron and the interface.
- `renderer` contains the React application.
- `shared` contains contracts that can be used across process boundaries.

See [docs/V1_SCOPE.md](docs/V1_SCOPE.md) for the complete V1 scope, safety
requirements, current implementation status, and explicitly deferred features.

## License

The project license has not been defined yet.
