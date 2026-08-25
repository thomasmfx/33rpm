import styles from './VinylCard.module.scss';
import { Card, Image, Text, Stack } from '@mantine/core';
import { Link } from 'react-router-dom';

interface VinylCardProps {
  thumbSrc: string;
  diskInfo: {
    id: number;
    title: string;
    artist: string;
    releaseYear: number;
    genre: string;
    price: number;
  };
}

function VinylCard({ thumbSrc, diskInfo }: Readonly<VinylCardProps>) {
  return (
    <Card
      component={Link}
      to={`/disco/${diskInfo.id}`}
      padding={0}
      radius="md"
      shadow="sm"
      className={styles.card}
    >
      <div className={styles.capa}>
        <Image
          src={thumbSrc}
          w="100%"
          h="100%"
          fit="cover"
          alt={diskInfo.title}
        />
      </div>

      <Stack className={styles.info} justify="space-between">
        <Stack gap={0}>
          <Text size="lg" fw={700} lineClamp={2} lh={1.3}>
            {diskInfo.title}
          </Text>
          <Text size="md" fw={400} lineClamp={1}>
            {diskInfo.artist}
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text size="sm" fw={300}>{diskInfo.releaseYear}</Text>
          <Text size="sm" fw={300}>{diskInfo.genre}</Text>
          <Text size="sm" fw={300}>R${diskInfo.price}</Text>
        </Stack>
      </Stack>
    </Card>
  );
}

export default VinylCard;
