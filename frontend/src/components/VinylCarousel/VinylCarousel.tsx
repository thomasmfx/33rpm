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
      slideSize="25%"
      slideGap="lg"
      emblaOptions={{
        loop: false,
        dragFree: true,
        align: 'start'
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
