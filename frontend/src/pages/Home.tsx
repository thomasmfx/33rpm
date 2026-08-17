import styles from "./Home.module.scss";
import { Container, Flex, Group, Title } from "@mantine/core";
import SpinningDisk from "../components/SpinningDisk/SpinningDisk";

function Home() {
  return (
    <div className={styles.heroContainer}> 
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <Title order={1} size="100">O acervo da sua estética sonora</Title>
          <Title order={2} size="24" fw={400} maw="40ch">A música em sua forma atemporal. Cultive as sonoridades que você já ama e abra espaço para o inesperado.</Title>
        </div>
        <div className={styles.heroDisk}>
          <SpinningDisk />
        </div>
      </div>
    </ div>
  )
}

export default Home;