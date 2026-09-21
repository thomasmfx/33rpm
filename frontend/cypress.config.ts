import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'sbfbrb',
  e2e: {
    baseUrl: 'http://localhost:3300',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    viewportWidth: 1440,
    viewportHeight: 900,
    env: {
      // a suíte roda contra a API real; o perfil dev expõe a recarga da massa
      apiUrl: 'http://localhost:8080/api',
    },
  },
});
