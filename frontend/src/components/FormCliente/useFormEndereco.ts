import { useForm } from '@mantine/form';
import type { Endereco, TipoEndereco } from '../../types/cliente';
import { apenasDigitos, mascararCep } from '../../utils/texto';

export interface FormEnderecoValues {
  nome: string;
  tipo: TipoEndereco;
  tipoResidencia: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
  observacoes: string;
}

/**
 * RN0023: todo campo do endereço é obrigatório, menos as observações.
 *
 * Controlado de propósito: o ViaCEP preenche campos enquanto o cliente digita
 * em outro, e no modo uncontrolled cada setFieldValue remontaria o campo.
 */
export function useFormEndereco(inicial?: Partial<Endereco>) {
  return useForm<FormEnderecoValues>({
    mode: 'controlled',
    validateInputOnBlur: true,
    initialValues: {
      nome: inicial?.nome ?? '',
      tipo: inicial?.tipo ?? 'ambos',
      tipoResidencia: inicial?.tipoResidencia ?? '',
      tipoLogradouro: inicial?.tipoLogradouro ?? '',
      logradouro: inicial?.logradouro ?? '',
      numero: inicial?.numero ?? '',
      bairro: inicial?.bairro ?? '',
      cep: mascararCep(inicial?.cep ?? ''),
      cidade: inicial?.cidade ?? '',
      estado: inicial?.estado ?? '',
      pais: inicial?.pais ?? 'Brasil',
      observacoes: inicial?.observacoes ?? '',
    },

    validate: {
      nome: (value) => (value.trim() ? null : 'Informe um nome para o endereço'),
      tipoResidencia: (value) =>
        value ? null : 'Selecione o tipo de residência',
      tipoLogradouro: (value) =>
        value ? null : 'Selecione o tipo de logradouro',
      logradouro: (value) => (value.trim() ? null : 'Informe o logradouro'),
      numero: (value) => (value.trim() ? null : 'Informe o número'),
      bairro: (value) => (value.trim() ? null : 'Informe o bairro'),
      cep: (value) =>
        apenasDigitos(value).length === 8 ? null : 'CEP deve ter 8 dígitos',
      cidade: (value) => (value.trim() ? null : 'Informe a cidade'),
      estado: (value) => (value ? null : 'Selecione o estado'),
      pais: (value) => (value.trim() ? null : 'Informe o país'),
    },
  });
}

export type FormEnderecoForm = ReturnType<typeof useFormEndereco>;
