import styles from './Formulario.module.scss';
import { useState } from 'react';
import { Select, Textarea, TextInput } from '@mantine/core';
import type { TipoEndereco } from '../../types/cliente';
import { ESTADOS, TIPOS_LOGRADOURO, TIPOS_RESIDENCIA } from '../../types/cliente';
import { ROTULO_TIPO_ENDERECO } from '../../utils/perfilCliente';
import { apenasDigitos, mascararCep } from '../../utils/texto';
import { comMascara } from '../../utils/formulario';
import { buscarCep } from '../../services/cepService';
import type { EnderecoDoCep } from '../../services/cepService';
import type { FormEnderecoForm } from './useFormEndereco';
import { Checkmark, WarningAlt } from '@carbon/icons-react';

const OPCOES_TIPO_ENDERECO = (
  Object.entries(ROTULO_TIPO_ENDERECO) as [TipoEndereco, string][]
).map(([value, label]) => ({ value, label }));

type StatusCep = 'ocioso' | 'buscando' | 'encontrado' | 'nao-encontrado';

const MENSAGEM_CEP: Record<StatusCep, string> = {
  ocioso: 'Digite o CEP e preenchemos o resto.',
  buscando: 'Procurando o CEP…',
  encontrado: 'Endereço encontrado. Confira e complete.',
  'nao-encontrado': 'CEP não encontrado. Preencha o endereço à mão.',
};

const CAMPOS_DO_CEP: (keyof EnderecoDoCep)[] = [
  'tipoLogradouro',
  'logradouro',
  'bairro',
  'cidade',
  'estado',
];

// campo onde o cursor está agora, marcado por data-campo no wrapper
function campoEmFoco(): string | null {
  return document.activeElement?.closest('[data-campo]')?.getAttribute('data-campo') ?? null;
}

interface CamposEnderecoProps {
  form: FormEnderecoForm;
  /** O cadastro troca o seletor de tipo por um checkbox de cobrança. */
  comTipo?: boolean;
}

export default function CamposEndereco({ form, comTipo = true }: Readonly<CamposEnderecoProps>) {
  const [statusCep, setStatusCep] = useState<StatusCep>('ocioso');

  /**
   * O ViaCEP só preenche o que está vazio e fora de foco: não apaga o que o
   * cliente já digitou nem troca o valor do campo em que ele está digitando.
   */
  async function preencherPeloCep(cep: string): Promise<void> {
    setStatusCep('buscando');
    const achado = await buscarCep(cep);
    if (!achado) {
      setStatusCep('nao-encontrado');
      return;
    }

    const atuais = form.getValues();
    const foco = campoEmFoco();
    for (const campo of CAMPOS_DO_CEP) {
      if (achado[campo] && !atuais[campo].trim() && foco !== campo) {
        form.setFieldValue(campo, achado[campo]);
      }
    }
    setStatusCep('encontrado');
  }

  const cep = form.getInputProps('cep');

  return (
    <div className={styles.campos}>
      <div className={styles.linhaCep}>
        <TextInput
          label="CEP"
          placeholder="00000-000"
          inputMode="numeric"
          data-testid="endereco-cep"
          key={form.key('cep')}
          {...cep}
          onChange={comMascara(mascararCep, (evento) => {
            cep.onChange(evento);
            const digitos = apenasDigitos(evento.currentTarget.value);
            if (digitos.length === 8) void preencherPeloCep(digitos);
          })}
        />
        <span className={styles.statusCep} data-status={statusCep}>
          {statusCep === 'encontrado' && <Checkmark size={16} />}
          {statusCep === 'nao-encontrado' && <WarningAlt size={16} />}
          {MENSAGEM_CEP[statusCep]}
        </span>
      </div>

      <div className={styles.gradeLogradouro}>
        <Select
          label="Tipo de logradouro"
          placeholder="Selecione"
          data={TIPOS_LOGRADOURO}
          data-testid="endereco-tipo-logradouro"
          allowDeselect={false}
          wrapperProps={{ 'data-campo': 'tipoLogradouro' }}
          key={form.key('tipoLogradouro')}
          {...form.getInputProps('tipoLogradouro')}
        />
        <TextInput
          label="Logradouro"
          placeholder="Ex.: das Flores"
          data-testid="endereco-logradouro"
          wrapperProps={{ 'data-campo': 'logradouro' }}
          key={form.key('logradouro')}
          {...form.getInputProps('logradouro')}
        />
        <TextInput
          label="Número"
          placeholder="123"
          data-testid="endereco-numero"
          key={form.key('numero')}
          {...form.getInputProps('numero')}
        />
      </div>

      <div className={styles.gradeCidade}>
        <TextInput
          label="Bairro"
          data-testid="endereco-bairro"
          wrapperProps={{ 'data-campo': 'bairro' }}
          key={form.key('bairro')}
          {...form.getInputProps('bairro')}
        />
        <TextInput
          label="Cidade"
          data-testid="endereco-cidade"
          wrapperProps={{ 'data-campo': 'cidade' }}
          key={form.key('cidade')}
          {...form.getInputProps('cidade')}
        />
        <Select
          label="UF"
          placeholder="UF"
          data={ESTADOS}
          data-testid="endereco-estado"
          searchable
          allowDeselect={false}
          wrapperProps={{ 'data-campo': 'estado' }}
          key={form.key('estado')}
          {...form.getInputProps('estado')}
        />
      </div>

      <div className={styles.grade3}>
        <TextInput
          label="Nome do endereço"
          placeholder="Ex.: Casa da praia"
          data-testid="endereco-nome"
          key={form.key('nome')}
          {...form.getInputProps('nome')}
        />
        <Select
          label="Tipo de residência"
          placeholder="Selecione"
          data={TIPOS_RESIDENCIA}
          data-testid="endereco-tipo-residencia"
          allowDeselect={false}
          key={form.key('tipoResidencia')}
          {...form.getInputProps('tipoResidencia')}
        />
        <TextInput
          label="País"
          data-testid="endereco-pais"
          key={form.key('pais')}
          {...form.getInputProps('pais')}
        />
      </div>

      {comTipo && (
        <Select
          label="Uso do endereço"
          data={OPCOES_TIPO_ENDERECO}
          data-testid="endereco-tipo"
          allowDeselect={false}
          key={form.key('tipo')}
          {...form.getInputProps('tipo')}
        />
      )}

      <Textarea
        label="Complemento e observações (opcional)"
        placeholder="Ex.: bloco B, apto 72"
        autosize
        minRows={2}
        data-testid="endereco-observacoes"
        key={form.key('observacoes')}
        {...form.getInputProps('observacoes')}
      />
    </div>
  );
}
