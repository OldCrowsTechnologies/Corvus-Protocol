// Registers the resolution hooks on the main thread before the harness loads.
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
