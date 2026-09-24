import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import './index.scss'
// o tema vem antes das rotas: assim o CSS dos módulos das telas entra depois e
// vence os overrides do tema quando a especificidade empata
import { resolverVariaveis, tema } from './theme/theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes.tsx'
import { MantineProvider } from '@mantine/core'


const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={tema} cssVariablesResolver={resolverVariaveis} defaultColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
)
