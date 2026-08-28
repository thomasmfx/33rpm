import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './index.scss'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes.tsx'
import { createTheme, MantineProvider } from '@mantine/core'


const router = createBrowserRouter(routes)

const theme = createTheme({
  components: {
    Modal: {
      defaultProps: { transitionProps: { duration: 120 } },
    },
  },
  fontFamily: '"Uxum Grotesque", sans-serif',
  headings: {
    fontFamily: '"Uxum Grotesque", sans-serif',
    fontWeight: '700',
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
)
