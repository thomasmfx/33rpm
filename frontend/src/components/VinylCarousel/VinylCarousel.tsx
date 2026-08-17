import '@mantine/carousel/styles.css';
import styles from './VinylCarousel.module.scss';
import { Carousel } from '@mantine/carousel';
import VinylCard from '../VinylCard/VinylCard';
import { vinylMock } from '../../utils/vinylMock';

const thumbSrc = vinylMock.images[0].uri;

const diskInfo = {
  id: vinylMock.id,
  title: vinylMock.title,
  artist: vinylMock.artists[0].name,
  releaseYear: vinylMock.year,
  genre: vinylMock.genres[0],
  price: 500
}

function VinylCarousel() {
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
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
      <Carousel.Slide>
        <VinylCard thumbSrc={thumbSrc} diskInfo={diskInfo} />
      </Carousel.Slide> 
    </Carousel>
  )
}

export default VinylCarousel;