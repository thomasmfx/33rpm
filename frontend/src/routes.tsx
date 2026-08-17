import App from "./App";
import Home from "./pages/Home";

export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> }
    ]
  }
]
