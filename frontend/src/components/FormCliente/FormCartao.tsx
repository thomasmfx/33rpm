import styles from './Formulario.module.scss';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Checkbox, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Cartao } from '../../types/cliente';
import { BANDEIRAS } from '../../types/cliente';
import { apenasDigitos, mascararNumeroCartao } from '../../utils/texto';
import { comMascara } from '../../utils/formulario';
import { detectarBandeira } from '../../utils/perfilCliente';

export interface FormCartaoValues {
  numero: string;
  nomeImpresso: string;
  bandeira: string;
  codigoSeguranca: string;
  isPreferencial: boolean;
}

interface FormCartaoProps {
  initialValues?: Cartao;
  titulo?: string;
  rotuloSalvar?: string;
  /** Esconde o "preferencial" quando o formulário não mexe no perfil. */
  comPreferencial?: boolean;
  extra?: ReactNode;
  onCancelar: () => void;
  onSubmit: (valores: FormCartaoValues) => void;
}

export default function FormCartao({
  initialValues,
  titulo,
  rotuloSalvar = 'Salvar cartão',
  comPreferencial = true,
  extra,
  onCancelar,
  onSubmit,
}: Readonly<FormCartaoProps>) {
  const [bandeiraDetectada, setBandeiraDetectada] = useState(() =>
    detectarBandeira(initialValues?.numero ?? ''),
  );

  // controlado: a bandeira detectada entra no Select sem remontar o campo
  const form = useForm<FormCartaoValues>({
    mode: 'controlled',
    validateInputOnBlur: true,
    initialValues: {
      numero: mascararNumeroCartao(initialValues?.numero ?? ''),
      nomeImpresso: initialValues?.nomeImpresso ?? '',
      bandeira: initialValues?.bandeira ?? '',
      codigoSeguranca: initialValues?.codigoSeguranca ?? '',
      isPreferencial: initialValues?.isPreferencial ?? false,
    },

    validate: {
      numero: (value) => {
        const digitos = apenasDigitos(value).length;
        return digitos >= 13 && digitos <= 19 ? null : 'Número de cartão inválido';
      },
      nomeImpresso: (value) =>
        value.trim() ? null : 'Informe o nome impresso no cartão',
      bandeira: (value) => (value ? null : 'Selecione a bandeira'),
      codigoSeguranca: (value) => {
        const digitos = apenasDigitos(value).length;
        return digitos === 3 || digitos === 4
          ? null
          : 'Código de segurança inválido';
      },
    },
  });

  const numero = form.getInputProps('numero');

  // RN0025: a bandeira sai do número, mas só entra se o campo ainda estiver vazio
  function handleNumero(valor: string): void {
    const detectada = detectarBandeira(valor);
    setBandeiraDetectada(detectada);
    if (detectada && !form.getValues().bandeira) {
      form.setFieldValue('bandeira', detectada);
    }
  }

  return (
    <div className={styles.form}>
      <h3 className={styles.subtitulo}>
        {titulo ?? (initialValues ? 'Editar cartão' : 'Novo cartão')}
      </h3>

      <div className={styles.campos}>
        <TextInput
          label="Número do cartão"
          placeholder="0000 0000 0000 0000"
          inputMode="numeric"
          data-testid="cartao-numero"
          rightSectionWidth={140}
          rightSection={
            bandeiraDetectada && (
              <span className={styles.bandeiraDetectada}>{bandeiraDetectada}</span>
            )
          }
          key={form.key('numero')}
          {...numero}
          onChange={comMascara(mascararNumeroCartao, (evento) => {
            numero.onChange(evento);
            handleNumero(evento.currentTarget.value);
          })}
        />

        <TextInput
          label="Nome impresso"
          placeholder="Como está no cartão"
          data-testid="cartao-nome-impresso"
          styles={{ input: { textTransform: 'uppercase' } }}
          key={form.key('nomeImpresso')}
          {...form.getInputProps('nomeImpresso')}
        />

        <div className={styles.grade2}>
          <Select
            label="Bandeira"
            placeholder="Selecione"
            data={BANDEIRAS}
            data-testid="cartao-bandeira"
            allowDeselect={false}
            key={form.key('bandeira')}
            {...form.getInputProps('bandeira')}
          />
          <TextInput
            label="Código de segurança"
            placeholder="3 ou 4 dígitos no verso"
            inputMode="numeric"
            maxLength={4}
            data-testid="cartao-cvv"
            key={form.key('codigoSeguranca')}
            {...form.getInputProps('codigoSeguranca')}
          />
        </div>

        {comPreferencial && (
          <Checkbox
            label="Usar como cartão preferencial"
            data-testid="cartao-preferencial"
            key={form.key('isPreferencial')}
            {...form.getInputProps('isPreferencial', { type: 'checkbox' })}
          />
        )}
      </div>

      {extra}

      <div className={styles.rodapeInline}>
        <Button type="button" variant="default" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          data-testid="btn-salvar-cartao"
          onClick={() => form.onSubmit(onSubmit)()}
        >
          {rotuloSalvar}
        </Button>
      </div>
    </div>
  );
}
