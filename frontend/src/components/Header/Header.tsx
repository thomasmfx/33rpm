import styles from "./Header.module.scss";
import { Link } from "react-router-dom";
import { Group, Indicator, Text, TextInput } from "@mantine/core";
import { IconSearch, IconShoppingCart } from "@tabler/icons-react";
import { useLoja } from "../../contexts/loja";

function Header() {
  const { itensNoCarrinho } = useLoja();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.headerLogo}>
        <Text fw={700}>33rpm</Text>
      </Link>
      <TextInput
        radius="sm"
        flex={0.7}
        placeholder="Busque um disco em nosso acervo"
        rightSection={<IconSearch color="#000"/>}
      />
      <Group>
        <Link to="/acervo" className={styles.headerLink}> 
          <Text fw={700}>Acervo</Text>
        </ Link>
        <Link to="/curadoria" className={styles.headerLink}> 
          <Text fw={700}>Curadoria</Text>
        </ Link>
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