import styles from "./Header.module.scss";
import { Link } from "react-router-dom";
import { Group, NavLink, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.headerLogo}>
        <Text fw={700}>33rpm</Text>
      </Link>
      <TextInput
        radius="sm"
        flex={0.7}
        placeholder="Qual a vibe de hoje?"
        rightSection={<IconSearch color="#000"/>}
      />
      <Group>
        <Link to="/discos" className={styles.headerLink}> 
          <Text fw={700}>Explorar</Text>
        </ Link>
        <Link to="/gerenciar" className={styles.headerLink}> 
          <Text fw={700}>Gerenciar</Text>
        </ Link>
      </Group>
    </header>
  )
}

export default Header