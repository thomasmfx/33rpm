import styles from './Formulario.module.scss';
import { useState } from 'react';
import { Add } from '@carbon/icons-react';
import type { Cartao } from '../../types/cliente';
import {
  adicionarCartao,
  atualizarCartao,
  definirPreferencial,
  mascararCartao,
  removerCartao,
} from '../../utils/perfilCliente';
import FormCartao, { type FormCartaoValues } from './FormCartao';

interface ListaCartoesProps {
  cartoes: Cartao[];
  onChange: (cartoes: Cartao[]) => void;
  onFormAberto: (aberto: boolean) => void;
}

export default function ListaCartoes({
  cartoes,
  onChange,
  onFormAberto,
}: Readonly<ListaCartoesProps>) {
  const [cartaoEmEdicao, setCartaoEmEdicao] = useState<Cartao | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  function abrirForm(cartao: Cartao | null): void {
    setCartaoEmEdicao(cartao);
    setIsFormVisible(true);
    onFormAberto(true);
  }

  function handleFecharForm(): void {
    setIsFormVisible(false);
    setCartaoEmEdicao(null);
    onFormAberto(false);
  }

  function handleSubmitCartao(valores: FormCartaoValues): void {
    onChange(
      cartaoEmEdicao
        ? atualizarCartao(cartoes, { ...cartaoEmEdicao, ...valores })
        : adicionarCartao(cartoes, {
            ...valores,
            id: crypto.randomUUID().slice(0, 8),
          }),
    );
    handleFecharForm();
  }

  if (isFormVisible) {
    return (
      <FormCartao
        initialValues={cartaoEmEdicao ?? undefined}
        onCancelar={handleFecharForm}
        onSubmit={handleSubmitCartao}
      />
    );
  }

  return (
    <div className={styles.campos}>
      <p className={styles.ajuda}>
        Cartão é opcional no cadastro. Havendo cartões, um deles é sempre o
        preferencial (RF0027).
      </p>

      {cartoes.length > 0 && (
        <div className={styles.lista}>
          {cartoes.map((cartao) => (
            <div key={cartao.id} className={styles.item}>
              <div className={styles.itemTexto}>
                <div className={styles.itemTopo}>
                  <strong>
                    {cartao.bandeira}{' '}
                    <span className={styles.numeroCartao}>{mascararCartao(cartao.numero)}</span>
                  </strong>
                  {cartao.isPreferencial && (
                    <span className={styles.tagSelo}>Preferencial</span>
                  )}
                </div>
                <span>{cartao.nomeImpresso}</span>
              </div>

              <div className={styles.itemAcoes}>
                {!cartao.isPreferencial && (
                  <button
                    type="button"
                    className={styles.acaoTexto}
                    onClick={() => onChange(definirPreferencial(cartoes, cartao.id))}
                  >
                    Tornar preferencial
                  </button>
                )}
                <button
                  type="button"
                  className={styles.acaoTexto}
                  aria-label={`Editar cartão ${mascararCartao(cartao.numero)}`}
                  onClick={() => abrirForm(cartao)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.acaoPerigo}
                  aria-label={`Remover cartão ${mascararCartao(cartao.numero)}`}
                  onClick={() => onChange(removerCartao(cartoes, cartao.id))}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.adicionar}
        data-testid="btn-adicionar-cartao"
        onClick={() => abrirForm(null)}
      >
        <Add size={20} /> Adicionar cartão
      </button>
    </div>
  );
}
