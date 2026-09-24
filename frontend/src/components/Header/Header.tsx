import styles from "./Header.module.scss";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, Skeleton } from "@mantine/core";
import { Dashboard, Login, Logout, Search, ShoppingCart, User, UserFollow } from "@carbon/icons-react";
import { useLoja } from "../../contexts/loja";

function Header() {
  const {
    itensNoCarrinho,
    clienteAtivo,
    administradorAtivo,
    carregandoClientes,
    carregandoSessao,
    sairDaSessao,
  } = useLoja();
  // quem está na sessão, seja cliente ou administrador
  const usuario = clienteAtivo ?? administradorAtivo;
  const [busca, setBusca] = useState('');
  const navegar = useNavigate();

  function handleBuscar(evento: React.FormEvent) {
    evento.preventDefault();
    const termo = busca.trim();
    navegar(termo ? `/acervo?busca=${encodeURIComponent(termo)}` : '/acervo');
  }

  function renderSessao() {
    if (carregandoSessao) {
      return (
        <span className={styles.sessaoCarregando} aria-label="Carregando sessão">
          <Skeleton circle height={28} />
          <Skeleton height={12} width={110} />
        </span>
      );
    }

    return (
      <Menu width={240} position="bottom-end">
        <Menu.Target>
          <button className={styles.sessaoBotao} type="button">
            {usuario ? (
              <>
                <span className={styles.avatar}>{usuario.nome.charAt(0)}</span>
                <span className={styles.nomeSessao}>{usuario.nome}</span>
              </>
            ) : (
              <>
                <Login size={20} />
                Entrar
              </>
            )}
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          {administradorAtivo && (
            <Menu.Item component={Link} to="/curadoria" leftSection={<Dashboard size={16} />}>
              Curadoria
            </Menu.Item>
          )}
          {usuario ? (
            <>
              <Menu.Item
                component={Link}
                to="/perfil"
                leftSection={<User size={16} />}
                data-testid="menu-perfil"
              >
                Minha conta
              </Menu.Item>
              <Menu.Item
                leftSection={<Logout size={16} />}
                data-testid="menu-sair"
                onClick={sairDaSessao}
              >
                Sair
              </Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item
                component={Link}
                to="/login"
                leftSection={<Login size={16} />}
                data-testid="menu-entrar"
              >
                Entrar
              </Menu.Item>
              <Menu.Item
                component={Link}
                to="/cadastro"
                leftSection={<UserFollow size={16} />}
                data-testid="menu-criar-conta"
              >
                Criar conta
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.lado}>
        <Link to="/" className={styles.logo}>
          <img src="/brand/logo-33rpm-escuro.svg" alt="33rpm" />
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/acervo" className={styles.link}>
            Acervo
          </NavLink>
          {administradorAtivo ? (
            <NavLink to="/curadoria" className={styles.link}>
              Curadoria <span className={styles.etiquetaAdmin}>Admin</span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/cupons" className={styles.link}>
                Cupons
              </NavLink>
              <NavLink to="/pedidos" className={styles.link}>
                Pedidos
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <div className={styles.ladoDireito}>
        <form className={styles.busca} onSubmit={handleBuscar} role="search">
          <button className={styles.lupa} type="submit" aria-label="Buscar no acervo">
            <Search size={16} />
          </button>
          <input
            className={styles.buscaInput}
            placeholder="Busque por artista, disco ou gravadora"
            value={busca}
            onChange={(evento) => setBusca(evento.currentTarget.value)}
          />
        </form>

        <div className={styles.acoes}>
          {renderSessao()}
          <Link to="/carrinho" className={styles.carrinho} aria-label="Carrinho">
            <ShoppingCart size={20} />
            Carrinho
            {/* o carrinho é por cliente: até a sessão chegar, o número seria o do admin */}
            {!carregandoClientes && <span className={styles.contador}>{itensNoCarrinho}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
