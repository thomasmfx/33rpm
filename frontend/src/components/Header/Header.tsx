import styles from "./Header.module.scss";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, Skeleton } from "@mantine/core";
import { Dashboard, Login, Logout, Notification, Search, ShoppingCart, User, UserFollow } from "@carbon/icons-react";
import { useLoja } from "../../contexts/loja";
import type { Notificacao } from "../../types/notificacao";

const FORMATO_DATA_NOTIFICACAO = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function Header() {
  const {
    itensNoCarrinho,
    clienteAtivo,
    administradorAtivo,
    carregandoClientes,
    carregandoSessao,
    sairDaSessao,
    minhasNotificacoes,
    marcarNotificacaoComoLida,
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

  // RN0046: abrir a notificação marca como lida e leva à compra de que ela fala
  function handleAbrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.isLida) void marcarNotificacaoComoLida(notificacao.id);
    navegar('/pedidos', { state: { abrir: notificacao.pedidoId } });
  }

  function renderNotificacoes() {
    const naoLidas = minhasNotificacoes.filter((notificacao) => !notificacao.isLida).length;

    return (
      <Menu width={320} position="bottom-end">
        <Menu.Target>
          <button
            type="button"
            className={styles.notificacoes}
            aria-label="Notificações"
            data-testid="btn-notificacoes"
          >
            <Notification size={20} />
            {naoLidas > 0 && (
              <span className={styles.contador} data-testid="contador-notificacoes">
                {naoLidas}
              </span>
            )}
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          {minhasNotificacoes.length === 0 && <Menu.Label>Nenhuma notificação por enquanto.</Menu.Label>}
          {minhasNotificacoes.map((notificacao) => (
            <Menu.Item
              key={notificacao.id}
              data-testid="notificacao-item"
              data-lida={String(notificacao.isLida)}
              onClick={() => handleAbrirNotificacao(notificacao)}
            >
              <span className={styles.notificacao} data-lida={notificacao.isLida || undefined}>
                <span>{notificacao.mensagem}</span>
                <span className={styles.notificacaoData}>
                  {FORMATO_DATA_NOTIFICACAO.format(new Date(notificacao.data))}
                </span>
              </span>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
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
          {clienteAtivo && renderNotificacoes()}
          {renderSessao()}
          <Link
            to="/carrinho"
            className={styles.carrinho}
            aria-label="Carrinho"
            data-testid="link-carrinho"
          >
            <ShoppingCart size={20} />
            Carrinho
            {/* o carrinho é por cliente: até a sessão chegar, o número seria o do admin */}
            {!carregandoClientes && (
              <span className={styles.contador} data-testid="contador-carrinho">
                {itensNoCarrinho}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
