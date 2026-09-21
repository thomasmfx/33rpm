import styles from "./Header.module.scss";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Avatar, Group, Indicator, Menu, Text, TextInput } from "@mantine/core";
import {
  IconLogin2,
  IconLogout,
  IconSearch,
  IconShoppingCart,
  IconUserCog,
  IconUserPlus,
} from "@tabler/icons-react";
import { useLoja } from "../../contexts/loja";

function Header() {
  const { itensNoCarrinho, clientes, clienteAtivo, entrarComoCliente, sairDaSessao } =
    useLoja();
  const [busca, setBusca] = useState('');
  const navegar = useNavigate();

  function handleBuscar(evento: React.FormEvent) {
    evento.preventDefault();
    const termo = busca.trim();
    navegar(termo ? `/acervo?busca=${encodeURIComponent(termo)}` : '/acervo');
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.headerLogo}>
        <Text fw={700}>33rpm</Text>
      </Link>
      <form className={styles.headerBusca} onSubmit={handleBuscar}>
        <TextInput
          radius="sm"
          w="100%"
          placeholder="Busque um disco em nosso acervo"
          value={busca}
          onChange={(evento) => setBusca(evento.currentTarget.value)}
          rightSectionPointerEvents="all"
          rightSection={
            <button
              className={styles.buscaBotao}
              type="submit"
              aria-label="Buscar no acervo"
            >
              <IconSearch color="#000" />
            </button>
          }
        />
      </form>
      <Group className={styles.headerAcoes} gap="lg">
        <Link to="/acervo" className={styles.headerLink}> 
          <Text fw={700}>Acervo</Text>
        </ Link>
        <Link to="/cupons" className={styles.headerLink}> 
          <Text fw={700}>Cupons</Text>
        </ Link>
        <Link to="/pedidos" className={styles.headerLink}> 
          <Text fw={700}>Pedidos</Text>
        </ Link>
        <Link to="/curadoria" className={styles.headerLink}> 
          <Text fw={700}>Curadoria</Text>
        </ Link>
        <Menu shadow="md" width={260} position="bottom-end">
          <Menu.Target>
            <button className={styles.sessaoBotao} type="button">
              <Group gap={8} wrap="nowrap">
                <Avatar size={28} color={clienteAtivo ? 'orange' : 'gray'} radius="xl">
                  {clienteAtivo ? clienteAtivo.nome.charAt(0) : <IconUserCog size={16} />}
                </Avatar>
                <Text size="sm" fw={700} truncate="end" maw={150}>
                  {clienteAtivo ? clienteAtivo.nome : 'Administrador'}
                </Text>
              </Group>
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            {clienteAtivo ? (
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                data-testid="menu-sair"
                onClick={sairDaSessao}
              >
                Sair
              </Menu.Item>
            ) : (
              <>
                <Menu.Item
                  component={Link}
                  to="/login"
                  leftSection={<IconLogin2 size={16} />}
                  data-testid="menu-entrar"
                >
                  Entrar
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/cadastro"
                  leftSection={<IconUserPlus size={16} />}
                  data-testid="menu-criar-conta"
                >
                  Criar conta
                </Menu.Item>
              </>
            )}
            <Menu.Divider />
            <Menu.Label>Navegar como (curadoria)</Menu.Label>
            <Menu.Item
              leftSection={<IconUserCog size={16} />}
              disabled={!clienteAtivo}
              onClick={sairDaSessao}
            >
              Administrador
            </Menu.Item>
            {clientes
              .filter((cliente) => cliente.isAtivo)
              .map((cliente) => (
                <Menu.Item
                  key={cliente.id}
                  onClick={() => entrarComoCliente(cliente.id)}
                >
                  <Text size="sm" lineClamp={1}>{cliente.nome}</Text>
                </Menu.Item>
              ))}
          </Menu.Dropdown>
        </Menu>
        <Link to="/carrinho" className={styles.headerLink} aria-label="Carrinho">
          <Indicator
            label={itensNoCarrinho}
            size={16}
            color="orange"
            disabled={itensNoCarrinho === 0}
          >
            <IconShoppingCart />
          </Indicator>
        </ Link>
      </Group>
    </header>
  )
}

export default Header