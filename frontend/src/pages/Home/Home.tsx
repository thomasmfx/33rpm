import styles from "./Home.module.scss";
import { Title } from "@mantine/core";
import SpinningDisk from "../../components/SpinningDisk/SpinningDisk";
import VinylCarousel from "../../components/VinylCarousel/VinylCarousel";
import {
  discosEmAlta,
  discosMaisVendidos,
  discosNovidades,
} from "../../utils/discosMock";

function Home() {
  return (
    <main className={styles.main}>
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

      <section className={styles.section}>
        <Title>Em alta</Title>
        <VinylCarousel discos={discosEmAlta} />
      </section>

      <section className={styles.section}>
        <Title>Mais vendidos</Title>
        <VinylCarousel discos={discosMaisVendidos} />
      </section>

      <section className={styles.section}>
        <Title>Novidades</Title>
        <VinylCarousel discos={discosNovidades} />
      </section>
    </main>
  )
}

export default Home;