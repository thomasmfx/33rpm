import styles from './Formulario.module.scss';
import { useState } from 'react';
import { Add } from '@carbon/icons-react';
import { Alert, Tooltip } from '@mantine/core';
import type { Endereco, TipoEndereco } from '../../types/cliente';
import {
  ROTULO_TIPO_ENDERECO,
  linhaDoEndereco,
  motivoBloqueioRemocao,
  tiposFaltando,
} from '../../utils/perfilCliente';
import { mascararCep } from '../../utils/texto';
import FormEndereco, { type FormEnderecoValues } from './FormEndereco';

interface ListaEnderecosProps {
  enderecos: Endereco[];
  onChange: (enderecos: Endereco[]) => void;
  onFormAberto: (aberto: boolean) => void;
}

function mensagemTiposFaltando(faltando: TipoEndereco[]): string {
  if (faltando.includes('entrega') && faltando.includes('cobranca')) {
    return 'O cliente precisa de ao menos um endereço de entrega e um de cobrança (RN0021, RN0022). Um endereço marcado como "Entrega e cobrança" resolve os dois.';
  }
  if (faltando.includes('entrega')) {
    return 'O cliente precisa de ao menos um endereço de entrega (RN0022).';
  }
  return 'O cliente precisa de ao menos um endereço de cobrança (RN0021).';
}

export default function ListaEnderecos({
  enderecos,
  onChange,
  onFormAberto,
}: Readonly<ListaEnderecosProps>) {
  const [enderecoEmEdicao, setEnderecoEmEdicao] = useState<Endereco | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const faltando = tiposFaltando(enderecos);

  function abrirForm(endereco: Endereco | null): void {
    setEnderecoEmEdicao(endereco);
    setIsFormVisible(true);
    onFormAberto(true);
  }

  function handleFecharForm(): void {
    setIsFormVisible(false);
    setEnderecoEmEdicao(null);
    onFormAberto(false);
  }

  function handleSubmitEndereco(valores: FormEnderecoValues): void {
    onChange(
      enderecoEmEdicao
        ? enderecos.map((endereco) =>
            endereco.id === enderecoEmEdicao.id
              ? { ...endereco, ...valores }
              : endereco,
          )
        : [...enderecos, { ...valores, id: crypto.randomUUID().slice(0, 8) }],
    );
    handleFecharForm();
  }

  function handleRemover(enderecoId: string): void {
    onChange(enderecos.filter((endereco) => endereco.id !== enderecoId));
  }

  if (isFormVisible) {
    return (
      <FormEndereco
        initialValues={enderecoEmEdicao ?? undefined}
        onCancelar={handleFecharForm}
        onSubmit={handleSubmitEndereco}
      />
    );
  }

  return (
    <div className={styles.campos}>
      {faltando.length > 0 && (
        <Alert color="orange" title="Endereço obrigatório faltando">
          {mensagemTiposFaltando(faltando)}
        </Alert>
      )}

      <div className={styles.lista}>
        {enderecos.map((endereco) => {
          const motivoBloqueio = motivoBloqueioRemocao(enderecos, endereco.id);

          return (
            <div key={endereco.id} className={styles.item}>
              <div className={styles.itemTexto}>
                <div className={styles.itemTopo}>
                  <strong>{endereco.nome}</strong>
                  <span className={styles.tag}>{ROTULO_TIPO_ENDERECO[endereco.tipo]}</span>
                </div>
                <span>{linhaDoEndereco(endereco)}</span>
                <span>CEP {mascararCep(endereco.cep)}</span>
                {endereco.observacoes && <span>{endereco.observacoes}</span>}
              </div>

              <div className={styles.itemAcoes}>
                <button
                  type="button"
                  className={styles.acaoTexto}
                  aria-label={`Editar ${endereco.nome}`}
                  onClick={() => abrirForm(endereco)}
                >
                  Editar
                </button>
                <Tooltip label={motivoBloqueio} disabled={!motivoBloqueio}>
                  <span>
                    <button
                      type="button"
                      className={styles.acaoPerigo}
                      disabled={Boolean(motivoBloqueio)}
                      aria-label={`Remover ${endereco.nome}`}
                      onClick={() => handleRemover(endereco.id)}
                    >
                      Remover
                    </button>
                  </span>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.adicionar}
        data-testid="btn-adicionar-endereco"
        onClick={() => abrirForm(null)}
      >
        <Add size={20} /> Adicionar endereço
      </button>
    </div>
  );
}
