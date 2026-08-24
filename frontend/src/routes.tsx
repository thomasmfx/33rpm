import App from "./App";
import Home from "./pages/Home/Home";
import Curadoria from "./pages/Curadoria/Curadoria";
import Disco from "./pages/Disco/Disco";
import Acervo from "./pages/Acervo/Acervo";
import Carrinho from "./pages/Carrinho/Carrinho";

export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: '/curadoria', element: <Curadoria />},
      { path: '/disco/:id', element: <Disco /> },
      { path: '/acervo', element: <Acervo /> },
      { path: '/carrinho', element: <Carrinho /> }
    ]
  },

]
