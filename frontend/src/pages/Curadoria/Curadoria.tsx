import styles from './Curadoria.module.scss';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLoja } from '../../contexts/loja';
import { precisaDeAcao } from '../../utils/pedido';
import { ArrowLeft, ChartLine, Delivery, Catalog, Logout, UserMultiple } from '@carbon/icons-react';

function Curadoria() {
  const { clientes, discos, pedidos, carregandoClientes, administradorAtivo, sairDaSessao } =
    useLoja();
  const navegar = useNavigate();

  function sair(): void {
    sairDaSessao();
    navegar('/');
  }

  const paineis = [
    {
      rota: 'clientes',
      rotulo: 'Clientes',
      icone: <UserMultiple size={20} />,
      contagem: carregandoClientes ? null : clientes.length,
    },
    { rota: 'inventario', rotulo: 'Inventário', icone: <Catalog size={20} />, contagem: discos.length },
    {
      rota: 'pedidos',
      rotulo: 'Pedidos',
      icone: <Delivery size={20} />,
      // os pedidos de demonstração nascem dos clientes, então esperam por eles
      contagem: carregandoClientes ? null : pedidos.filter(precisaDeAcao).length,
    },
    { rota: 'dashboard', rotulo: 'Dashboard', icone: <ChartLine size={20} />, contagem: null },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.marca} aria-label="Voltar à loja">
          <img src="/brand/logo-33rpm-escuro.svg" alt="33rpm" />
          <span>Curadoria</span>
        </Link>

        <nav className={styles.nav}>
          {paineis.map((painel) => (
            <NavLink key={painel.rota} to={painel.rota} className={styles.item}>
              <span className={styles.itemRotulo}>
                {painel.icone}
                {painel.rotulo}
              </span>
              {painel.contagem !== null && (
                <span className={styles.contagem}>{painel.contagem}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={styles.rodape}>
          <div className={styles.usuario}>
            <strong>{administradorAtivo?.nome}</strong>
            <span className={styles.papel}>Administrador</span>
            <span className={styles.email}>{administradorAtivo?.email}</span>
          </div>
          <Link to="/" className={styles.voltar}>
            <ArrowLeft size={16} /> Ver a loja
          </Link>
          <button type="button" className={styles.sair} onClick={sair} data-testid="btn-sair-curadoria">
            <Logout size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default Curadoria;
