import styles from './Cupons.module.scss';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLoja } from '../../contexts/loja';
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio';
import { EsqueletoPagina } from '../../components/Esqueleto/Esqueleto';
import type { Cupom, TipoCupom } from '../../types/cupom';
import { cuponsDisponiveis, somarCupons } from '../../utils/checkout';
import { formatarBRL } from '../../utils/precificacao';
import { Checkmark, Copy } from '@carbon/icons-react';

const SECOES: { tipo: TipoCupom; titulo: string; descricao: string }[] = [
  {
    tipo: 'troca',
    titulo: 'Troca',
    descricao: 'Gerados quando uma troca é aceita ou quando os cupons de uma compra passam do total. Só valem para você.',
  },
  {
    tipo: 'promocional',
    titulo: 'Promocionais',
    descricao: 'Campanhas da loja. Valem para qualquer cliente, um por compra (RN0033).',
  },
];

function origemDoCupom(cupom: Cupom): string {
  if (cupom.isUtilizado) return 'Já utilizado em uma compra';
  return cupom.tipo === 'troca' ? 'Crédito de troca ou sobra de cupons' : 'Campanha da loja';
}

function Cupons() {
  const { clienteAtivo, carregandoClientes, cupons } = useLoja();
  const [copiado, setCopiado] = useState<string | null>(null);

  if (carregandoClientes) {
    return (
      <main className={styles.main}>
        <EsqueletoPagina blocos={[120, 120]} />
      </main>
    );
  }

  if (!clienteAtivo) {
    return <Navigate to="/login" state={{ depois: '/cupons' }} replace />;
  }

  const disponiveis = cuponsDisponiveis(cupons, clienteAtivo.id);
  const utilizados = cupons.filter(
    (cupom) =>
      cupom.isUtilizado &&
      (cupom.clienteId === null || cupom.clienteId === clienteAtivo.id),
  );

  if (disponiveis.length === 0 && utilizados.length === 0) {
    return (
      <main className={styles.main}>
        <EstadoVazio
          titulo="Nenhum cupom por enquanto"
          descricao="Cupons de troca aparecem aqui quando uma devolução é aceita, e os promocionais entram nas campanhas da loja."
          rotuloAcao="Explorar o acervo"
          paraAcao="/acervo"
        />
      </main>
    );
  }

  async function copiar(cupom: Cupom): Promise<void> {
    try {
      await navigator.clipboard.writeText(cupom.codigo);
      setCopiado(cupom.id);
    } catch {
      // sem permissão de área de transferência o código continua visível no cartão
    }
  }

  function rotuloCopiar(cupom: Cupom) {
    if (cupom.isUtilizado) return 'Utilizado';
    if (copiado === cupom.id) {
      return (
        <>
          <Checkmark size={16} /> Copiado
        </>
      );
    }
    return (
      <>
        <Copy size={16} /> Copiar código
      </>
    );
  }

  function renderCupom(cupom: Cupom) {
    return (
      <div key={cupom.id} className={styles.cupom} data-usado={cupom.isUtilizado || undefined}>
        <div className={styles.valor}>
          <strong>{formatarBRL(cupom.valor)}</strong>
          <span>{origemDoCupom(cupom)}</span>
        </div>
        <div className={styles.canhoto}>
          <span className={styles.codigo}>{cupom.codigo}</span>
          <button
            type="button"
            className={styles.copiar}
            data-copiado={copiado === cupom.id || undefined}
            disabled={cupom.isUtilizado}
            onClick={() => void copiar(cupom)}
          >
            {rotuloCopiar(cupom)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.cabecalho}>
        <div className={styles.titulo}>
          <h1>Meus cupons</h1>
          <p>
            Aplique no pagamento do checkout. Cupons de troca podem ser somados; se passarem do
            total, a diferença volta como um novo cupom de troca.
          </p>
        </div>
        <div className={styles.disponivel}>
          <span>Disponível</span>
          <strong>{formatarBRL(somarCupons(disponiveis))}</strong>
        </div>
      </div>

      {SECOES.map((secao) => {
        const daSecao = [...disponiveis, ...utilizados].filter((cupom) => cupom.tipo === secao.tipo);
        if (daSecao.length === 0) return null;

        return (
          <section key={secao.tipo} className={styles.secao}>
            <div className={styles.secaoTexto}>
              <h2>{secao.titulo}</h2>
              <p>{secao.descricao}</p>
            </div>
            <div className={styles.grade}>{daSecao.map(renderCupom)}</div>
          </section>
        );
      })}
    </main>
  );
}

export default Cupons;
