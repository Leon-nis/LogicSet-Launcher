# LogicSet Launcher V1 Scope

## Overview

LogicSet Launcher is a desktop utility for Torchlight II modded multiplayer,
focused on the LogicSet mod.

V1 focuses on pre-game utilities, basic local environment management, remote
modpack updates, and simple save management. It is not an anti-desync tool and
does not modify the game's runtime.

## V1 Scope

### 1. Pre-game Environment

- configure the path to `Torchlight2.exe`;
- configure the save or modsave directory;
- configure the mods directory;
- configure the path to `local_settings.txt`;
- show a basic environment checklist;
- validate that configured paths exist;
- configure the UDP port in `local_settings.txt`;
- back up `local_settings.txt` before editing it.

### 2. Mod Update

- read a remote `manifest.json` from the `LogicSet-modpack` repository;
- show the installed modpack version and the remote version;
- download the modpack `.zip`;
- validate the downloaded archive using SHA256;
- install or replace the modpack files.

Updating the launcher itself is not part of V1.

### 3. Saves

- list character files found in the configured save or modsave directory;
- allow a local alias for each character when the launcher cannot read the
  character's real name;
- move a character to an internal launcher trash directory;
- restore a character from the internal launcher trash directory;
- move the shared stash file to the internal launcher trash directory;
- block destructive save and stash actions while `Torchlight2.exe` is running.

V1 does not require advanced save parsing. Character entries may be represented
by their filename and an optional local alias.

### 4. Local Logging

The launcher must keep simple local logs for important actions, including:

- configured paths;
- UDP port changes;
- installed modpack updates;
- characters moved to the internal trash directory;
- shared stash files moved to the internal trash directory.

Logs are local only. V1 does not include remote telemetry.

## Safety and Quality Requirements

- the renderer must not have direct Node.js access;
- privileged operations must remain in the main process;
- communication across Electron processes must use typed contracts;
- filesystem changes must require explicit user intent;
- `local_settings.txt` must be backed up before modification;
- destructive save and stash actions must be blocked while the game is running;
- modpack downloads must pass SHA256 validation before installation;
- errors must not unexpectedly close the application;
- critical file operations must have focused automated tests.

## Out of Scope for V1

- desync checker;
- manual snapshots during gameplay;
- automatic character rollback;
- advanced save parsing;
- Torchlight II memory reading;
- DLL injection;
- network proxy;
- integrated VPN;
- automatic launcher updates;
- automatic character or stat correction;
- detection of defeated bosses;
- total playtime per character;
- character level or class read directly from save files;
- any system that modifies or attempts to control the game's internal runtime.

## Future MVP+ Ideas

- advanced character information:
  - playtime;
  - level;
  - class;
  - defeated bosses;
  - current area;
- save backup and rollback;
- snapshot comparison;
- possible desync checker;
- bug report export;
- automatic launcher updates;
- stable, beta, and dev modpack channels.

These items are future possibilities and are not V1 commitments.

## Current Implementation Status

The repository currently provides the application foundation:

- Electron, React, TypeScript, and Vite project structure;
- a secure Electron window with an isolated renderer;
- navigation between Environment, Saves, and Mod Update;
- typed service contracts in the main process;
- shared types for process communication.

The features listed in the V1 scope describe the target for V1 and may not all
be implemented yet.

## Pending Decisions

- supported Torchlight II distributions and default install locations;
- exact `LogicSet-modpack` manifest schema and release URL convention;
- local settings and alias persistence formats;
- internal trash directory layout and retention rules;
- packaging and distribution strategy;
- application license.
