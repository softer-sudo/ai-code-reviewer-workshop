// READY — load ./.env if it exists (Node 22). Real environment variables win over the file.
try {
  process.loadEnvFile();
} catch {
  // no .env file: fine
}
