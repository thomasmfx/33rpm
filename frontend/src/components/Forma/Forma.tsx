import { useId, useMemo } from 'react';

export type TipoForma =
  | 'flor'
  | 'roda'
  | 'estrela8'
  | 'pontos'
  | 'laco'
  | 'trevo'
  | 'cruz'
  | 'arco'
  | 'explosao'
  | 'semis'
  | 'gota';

export type PaletaForma = 'laranja' | 'carvao' | 'nevoa';

const PALETAS: Record<PaletaForma, [string, string, string]> = {
  laranja: ['#F7B08C', '#D9501F', '#7E2A10'],
  carvao: ['#8F8C84', '#2E2D2A', '#0B0B0A'],
  nevoa: ['#FFFFFF', '#E3E1DA', '#B5B2AA'],
};

// curva fechada em coordenadas polares, centrada no quadro 200×200
function polar(raio: (t: number) => number, passos = 240): string {
  let d = '';
  for (let i = 0; i <= passos; i++) {
    const t = (i / passos) * Math.PI * 2;
    const r = raio(t);
    d += `${i ? 'L' : 'M'}${(100 + r * Math.cos(t)).toFixed(2)} ${(100 + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}

function circulo(r: number): string {
  return `M${100 - r} 100a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function caminho(tipo: TipoForma): string {
  switch (tipo) {
    case 'flor':
      return polar((t) => 78 + 14 * Math.cos(9 * t));
    case 'roda':
      return polar((t) => 88 + 7 * Math.cos(14 * t)) + circulo(30);
    case 'trevo':
      return polar((t) => 66 + 28 * Math.cos(4 * t));
    case 'estrela8':
      return 'M100 0c12.424 62.382 37.256 87.456 100 100-62.759 12.544-87.591 37.618-100 100-12.424-62.382-37.256-87.471-100-100C62.758 87.456 87.591 62.382 100 0z';
    case 'pontos':
      return [25, 100, 175]
        .flatMap((y) =>
          [25, 100, 175].map((x) => `M${x - 25} ${y}a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z`),
        )
        .join('');
    case 'laco':
      return 'M136 0l-36 36L64 0H0v64l36 36-36 36v64h64l36-36 36 36h64v-64l-36-36 36-36V0h-64z';
    case 'cruz':
      return 'M68 32A32 32 0 0 1 132 32V168A32 32 0 0 1 68 168ZM32 68H168A32 32 0 0 1 168 132H32A32 32 0 0 1 32 68Z';
    case 'arco':
      return 'M0 200A200 200 0 0 1 200 0V84A116 116 0 0 0 84 200Z';
    case 'explosao': {
      let d = '';
      for (let i = 0; i < 32; i++) {
        const t = (i / 32) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 70 : 98;
        d += `${i ? 'L' : 'M'}${(100 + r * Math.cos(t)).toFixed(2)} ${(100 + r * Math.sin(t)).toFixed(2)}`;
      }
      return `${d}Z`;
    }
    case 'semis':
      return 'M16 96A84 84 0 0 1 184 96ZM16 192A84 84 0 0 1 184 192Z';
    case 'gota':
      return 'M100 4C100 4 176 88 176 128A76 76 0 0 1 24 128C24 88 100 4 100 4Z';
  }
}

interface FormaProps {
  tipo: TipoForma;
  paleta: PaletaForma;
  /** Segundos por volta; 0 deixa parada. */
  giro?: number;
}

/** Forma decorativa em gradiente com grão, a mesma função do protótipo. */
export default function Forma({ tipo, paleta, giro = 0 }: Readonly<FormaProps>) {
  // o id do React traz caracteres que quebram url(#...) em alguns navegadores
  const id = `forma${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const d = useMemo(() => caminho(tipo), [tipo]);
  const [clara, media, escura] = PALETAS[paleta];

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      aria-hidden
      style={{
        overflow: 'visible',
        animation: giro ? `girar ${giro}s linear infinite` : undefined,
      }}
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={clara} />
          <stop offset="55%" stopColor={media} />
          <stop offset="100%" stopColor={escura} />
        </linearGradient>
        <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={3}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="ng" />
          <feComponentTransfer in="ng" result="na">
            <feFuncA type="table" tableValues="0 0.55" />
          </feComponentTransfer>
          <feComposite in="na" in2="SourceGraphic" operator="in" result="gr" />
          <feBlend in="gr" in2="SourceGraphic" mode="soft-light" />
        </filter>
      </defs>
      <path
        d={d}
        fill={`url(#${id}g)`}
        fillRule={tipo === 'roda' ? 'evenodd' : 'nonzero'}
        filter={`url(#${id}n)`}
      />
    </svg>
  );
}

interface OndasProps {
  cor: string;
  linhas: number;
  opacidade: number;
  amplitude: number;
}

/** Linhas senoidais que correm devagar no fundo das seções da Home. */
export function Ondas({ cor, linhas, opacidade, amplitude }: Readonly<OndasProps>) {
  const caminhos = useMemo(() => {
    const largura = 2880;
    const altura = 800;
    const onda = 720;
    return Array.from({ length: linhas }, (_, i) => {
      const base = 60 + i * ((altura - 120) / (linhas - 1));
      const a = amplitude * (0.55 + 0.45 * Math.sin(i * 0.7));
      const fase = i * 0.42;
      let d = '';
      for (let x = 0; x <= largura; x += 24) {
        const y =
          base +
          a * Math.sin((2 * Math.PI * x) / onda + fase) +
          a * 0.35 * Math.sin((4 * Math.PI * x) / onda + fase * 1.7);
        d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
      }
      return d;
    });
  }, [linhas, amplitude]);

  return (
    <svg
      viewBox="0 0 2880 800"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '200%',
        maxWidth: 'none',
        height: '100%',
        opacity: opacidade,
        animation: 'deslizar 60s linear infinite',
      }}
    >
      {caminhos.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={cor}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
