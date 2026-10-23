// Local Express/demo configuration must never turn a deployment build into
// a development bundle. Set this before Vite loads the local .env file.
process.env.NODE_ENV = 'production';

const { build } = await import('vite');
await build();
