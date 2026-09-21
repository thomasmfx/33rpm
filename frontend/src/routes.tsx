import { Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home/Home";
import Curadoria from "./pages/Curadoria/Curadoria";
import CuradoriaClientes from "./components/CuradoriaClientes/CuradoriaClientes";
import CuradoriaInventario from "./components/CuradoriaInventario/CuradoriaInventario";
import CuradoriaPedidos from "./components/CuradoriaPedidos/CuradoriaPedidos";
import CuradoriaDashboard from "./components/CuradoriaDashboard/CuradoriaDashboard";
import Disco from "./pages/Disco/Disco";
import Acervo from "./pages/Acervo/Acervo";
import Carrinho from "./pages/Carrinho/Carrinho";
import Checkout from "./pages/Checkout/Checkout";
import Pedidos from "./pages/Pedidos/Pedidos";
import Cupons from "./pages/Cupons/Cupons";
import Login from "./pages/Login/Login";
import Cadastro from "./pages/Cadastro/Cadastro";

export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      {
        path: '/curadoria',
        element: <Curadoria />,
        children: [
          { index: true, element: <Navigate to="clientes" replace /> },
          { path: 'clientes', element: <CuradoriaClientes /> },
          { path: 'inventario', element: <CuradoriaInventario /> },
          { path: 'pedidos', element: <CuradoriaPedidos /> },
          { path: 'dashboard', element: <CuradoriaDashboard /> },
        ],
      },
      { path: '/disco/:id', element: <Disco /> },
      { path: '/acervo', element: <Acervo /> },
      { path: '/carrinho', element: <Carrinho /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/pedidos', element: <Pedidos /> },
      { path: '/cupons', element: <Cupons /> },
      { path: '/login', element: <Login /> },
      { path: '/cadastro', element: <Cadastro /> }
    ]
  },

]
