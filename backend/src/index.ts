import dotenv from 'dotenv';
import { createApp } from './app';
import { AppContainer } from './container';

dotenv.config({ quiet: true });

async function bootstrap() {
  const container = new AppContainer();
  await container.init();

  const app = createApp(container);
  app.listen(container.config.port, '0.0.0.0', () => {
    console.log(
      `[MOONDROP API] Listening on http://127.0.0.1:${container.config.port}`
    );
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
