import { apenasDigitos } from './texto';

/*
 * Validações de formato dos dados cadastrais, repetidas no formulário só para
 * dar resposta imediata. Quem decide é o ClienteService no servidor (RN0026).
 */
export const VALIDACOES_DADOS_CLIENTE = {
  nome: (valor: string) => (valor.length < 3 ? 'O nome deve ter pelo menos 3 letras' : null),
  email: (valor: string) => (/^\S+@\S+$/.test(valor) ? null : 'E-mail inválido'),
  genero: (valor: string) => (valor ? null : 'Selecione um gênero'),
  cpf: (valor: string) => (apenasDigitos(valor).length === 11 ? null : 'CPF inválido'),
  telefone: {
    ddd: (valor: string) => (apenasDigitos(valor).length === 2 ? null : 'DDD inválido'),
    numero: (valor: string) => {
      const digitos = apenasDigitos(valor).length;
      return digitos === 8 || digitos === 9 ? null : 'Número inválido';
    },
  },
};
