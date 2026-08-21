import { Card, Group, Image, Text, Stack } from "@mantine/core";
import { Link } from "react-router-dom";

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
      padding="md" 
      radius="md" 
      style={{ 
        backgroundColor: 'transparent',
        textDecoration: 'none', 
        color: 'inherit'
      }}
    >
      <Card.Section 
        bg="#EDEDED" 
        style={{ 
          height: 260,
          width: 260,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <Image
          src={thumbSrc}
          fit="contain"
          alt={diskInfo.title}
        />
      </Card.Section>

      <Stack mt="md" >
        <Stack style={{gap: 0}}>
          <Text size="lg" fw={700}>
            {diskInfo.title}
          </Text>
          <Text size="md" fw={400}>
            {diskInfo.artist}
          </Text>
        </Stack>

        <Stack gap={4} mt="sm">
          <Text size="sm" fw={300}>{diskInfo.releaseYear}</Text>
          <Text size="sm" fw={300}>{diskInfo.genre}</Text>
          <Text size="sm" fw={300}>R${diskInfo.price}</Text>
        </Stack>

      </Stack>
    </Card>
  );
}

export default VinylCard;