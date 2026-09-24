import styles from './Formulario.module.scss';
import type { ReactNode } from 'react';
import { Button } from '@mantine/core';
import type { Endereco } from '../../types/cliente';
import CamposEndereco from './CamposEndereco';
import { useFormEndereco } from './useFormEndereco';
import type { FormEnderecoValues } from './useFormEndereco';

export type { FormEnderecoValues } from './useFormEndereco';

interface FormEnderecoProps {
  initialValues?: Endereco;
  titulo?: string;
  rotuloSalvar?: string;
  /** Conteúdo extra antes dos botões, como o "Salvar no meu perfil" do checkout. */
  extra?: ReactNode;
  onCancelar: () => void;
  onSubmit: (valores: FormEnderecoValues) => void;
}

/**
 * É uma <div>, não um <form>: vive dentro do <form> do FormCliente e do
 * checkout, e form aninhado faria o navegador submeter o de fora.
 */
export default function FormEndereco({
  initialValues,
  titulo,
  rotuloSalvar = 'Salvar endereço',
  extra,
  onCancelar,
  onSubmit,
}: Readonly<FormEnderecoProps>) {
  const form = useFormEndereco(initialValues);

  return (
    <div className={styles.form}>
      <h3 className={styles.subtitulo}>
        {titulo ?? (initialValues ? 'Editar endereço' : 'Novo endereço')}
      </h3>

      <CamposEndereco form={form} />
      {extra}

      <div className={styles.rodapeInline}>
        <Button type="button" variant="default" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          data-testid="btn-salvar-endereco"
          onClick={() => form.onSubmit(onSubmit)()}
        >
          {rotuloSalvar}
        </Button>
      </div>
    </div>
  );
}
