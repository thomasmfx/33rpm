import '@mantine/carousel/styles.css';
import styles from './VinylCarousel.module.scss';
import { Carousel } from '@mantine/carousel';
import VinylCard from '../VinylCard/VinylCard';
import type { Disco } from '../../types/disco';

interface VinylCarouselProps {
  discos: Disco[];
}

function VinylCarousel({ discos }: Readonly<VinylCarouselProps>) {
  return (
    <Carousel
      withIndicators
      // largura que não fecha 100% de propósito: sobra sempre um card cortado
      // na borda, sinalizando que há mais disco para o lado
      slideSize={{ base: '80%', xs: '55%', sm: '40%', md: '30%', lg: '22%' }}
      slideGap="lg"
      emblaOptions={{
        loop: false,
        dragFree: true,
        align: 'start',
        // sem isso o fim do carrossel abre espaço vazio depois do último disco
        containScroll: 'trimSnaps'
      }}
      classNames={{
        indicator: styles.indicador,
        indicators: styles.indicadoresContainer,
        controls: styles.controlesContainer,
        control: styles.controle,
      }}
    >
      {discos.map((disco) => (
        <Carousel.Slide key={disco.id}>
          <VinylCard
            thumbSrc={disco.coverSrc}
            diskInfo={{
              id: disco.id,
              title: disco.title,
              artist: disco.artist,
              releaseYear: disco.releaseYear,
              genre: disco.styles[0] ?? disco.genres[0],
              price: disco.price,
            }}
          />
        </Carousel.Slide>
      ))}
    </Carousel>
  )
}

export default VinylCarousel;
