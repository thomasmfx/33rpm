import App from "./App";
import Home from "./pages/Home/Home";
import Curadoria from "./pages/Curadoria/Curadoria";

export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: '/curadoria', element: <Curadoria />}
    ]
  },

]
