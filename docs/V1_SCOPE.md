# V1 Scope

## Overview

LogicSet Launcher is a desktop utility for players using Torchlight II modded
multiplayer with the LogicSet mod.

The V1 should reduce manual setup work and make the local game environment,
saves, and mod version easier to understand and maintain.

## Main Areas

### Environment

- identify the local Torchlight II installation;
- configure the directories used by the game and LogicSet;
- validate that required paths and files are available;
- present configuration problems in clear language.

### Saves

- discover local Torchlight II saves;
- present save information without modifying files automatically;
- provide the foundation for future safety and synchronization workflows.

### Mod Update

- identify the installed LogicSet version;
- check whether a supported update is available;
- present update information before any local change.

## Foundation Milestone

The first implementation milestone contains only:

- an Electron, React, TypeScript, and Vite project structure;
- a secure Electron window with an isolated renderer;
- navigation between Environment, Saves, and Mod Update;
- placeholder content for all three pages;
- typed service contracts in the main process;
- shared types for future process communication;
- a placeholder boundary for future local settings.

## Explicitly Not Implemented Yet

The foundation milestone does not include:

- filesystem discovery or validation;
- settings persistence;
- save discovery or parsing;
- mod update checks, downloads, or installation;
- multiplayer desync checks;
- snapshots or rollback;
- packaging or an installer.

## V1 Quality Requirements

- the renderer must not have direct Node.js access;
- privileged operations must remain in the main process;
- communication across Electron processes must use typed contracts;
- filesystem changes must require explicit user intent;
- errors must not unexpectedly close the application;
- critical file operations must have focused automated tests when implemented.

## Pending Decisions

- supported Torchlight II distributions and install locations;
- LogicSet manifest and update source;
- local settings format and migration strategy;
- save compatibility and backup rules;
- packaging and distribution strategy;
- application license.
