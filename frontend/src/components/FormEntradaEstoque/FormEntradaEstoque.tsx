import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './FormEntradaEstoque.module.scss';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, NumberInput, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import type { Disco } from '../../types/disco';
import { previaEntrada } from '../../services/estoqueService';
import type { PreviaEntrada } from '../../services/estoqueService';
import {
  formatarBRL,
  nomeGrupoPrecificacao,
  obterGrupoPrecificacao,
} from '../../utils/precificacao';

export interface FormEntradaEstoqueValues {
  quantidade: number;
  valorCusto: number;
  fornecedor: string;
  dataEntrada: string | null;
}

interface FormEntradaEstoqueProps {
  disco: Disco;
  /** RN0050: fornecedores registrados no servidor. */
  fornecedores: string[];
  /** Mensagens do servidor na última tentativa de registrar. */
  erros: string[];
  enviando: boolean;
  onClose?: () => void;
  onSubmit: (valores: FormEntradaEstoqueValues) => void;
}

export default function FormEntradaEstoque({
  disco,
  fornecedores,
  erros,
  enviando,
  onClose,
  onSubmit,
}: Readonly<FormEntradaEstoqueProps>) {
  // espelham os NumberInput só para a prévia reagir ao que se digita; o valor
  // que vale de verdade é sempre o do form, validado no submit
  const [quantidadePrevia, setQuantidadePrevia] = useState(1);
  const [custoPrevia, setCustoPrevia] = useState(0);

  // repete o formato só para dar resposta imediata, com as mensagens do servidor
  const form = useForm<FormEntradaEstoqueValues>({
    mode: 'uncontrolled',
    initialValues: {
      quantidade: 1,
      valorCusto: 0,
      fornecedor: '',
      dataEntrada: null,
    },

    onValuesChange: (values) => {
      setQuantidadePrevia(Number(values.quantidade) || 0);
      setCustoPrevia(Number(values.valorCusto) || 0);
    },

    validate: {
      quantidade: (valor) =>
        Number.isInteger(valor) && valor > 0
          ? null
          : 'A quantidade deve ser maior que zero (RN0061).',
      valorCusto: (valor) =>
        valor > 0 ? null : 'Informe um valor de custo maior que zero (RN0062).',
      fornecedor: (valor) => (valor ? null : 'Informe o fornecedor da entrada (RN0050).'),
      dataEntrada: (valor) => (valor ? null : 'Informe a data de entrada (RNF0064).'),
    },
  });

  // RF0052 + RN0051: o preço resultante vem do servidor, a mesma conta da gravação
  const consulta = useMemo(
    () => ({ quantidade: quantidadePrevia, valorCusto: custoPrevia }),
    [quantidadePrevia, custoPrevia],
  );
  const [consultaAdiada] = useDebouncedValue(consulta, 300);
  const [previa, setPrevia] = useState<{
    consulta: typeof consulta;
    valores: PreviaEntrada;
  } | null>(null);

  useEffect(() => {
    if (consultaAdiada.quantidade <= 0 || consultaAdiada.valorCusto <= 0) return;
    let cancelado = false;
    previaEntrada(disco.id, consultaAdiada.quantidade, consultaAdiada.valorCusto)
      .then((valores) => {
        if (!cancelado) setPrevia({ consulta: consultaAdiada, valores });
      })
      // a prévia só informa; o registro devolve as mensagens se algo estiver errado
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [disco.id, consultaAdiada]);

  // a prévia só vale para os números que estão na tela agora
  const previaAtual = previa?.consulta === consulta ? previa.valores : null;
  const precoMuda =
    previaAtual !== null && previaAtual.precoResultante !== previaAtual.precoAtual;

  const grupoPrecificacao = obterGrupoPrecificacao(disco.grupoPrecificacaoId);
  const nomeGrupo = nomeGrupoPrecificacao(disco.grupoPrecificacaoId);
  const margem = grupoPrecificacao?.margemLucro ?? 0;

  function explicacaoPreco(): string {
    if (disco.autorizacaoGerente !== null) {
      return `O preço foi baixado da margem com autorização de ${disco.autorizacaoGerente}, então a entrada não o reajusta (RN0014).`;
    }
    if (!previaAtual) {
      return `Informe a quantidade e o custo para ver o preço recalculado pelo grupo ${nomeGrupo} (+${margem}%).`;
    }
    if (precoMuda) {
      return `Recalculado pelo grupo ${nomeGrupo}: maior custo em estoque + ${margem}% (RN0051).`;
    }
    return 'O valor só sobe quando a entrada custa mais que o maior custo já registrado (RN0051).';
  }

  return (
    <form className={styles.form} onSubmit={form.onSubmit(onSubmit)}>
      <p className={painel.textoModal}>
        {disco.title} · {disco.artist} · {disco.estoque} em estoque hoje
      </p>

      <div className={styles.grade}>
        <NumberInput
          label="Quantidade"
          placeholder="10"
          min={1}
          step={1}
          allowDecimal={false}
          allowNegative={false}
          data-testid="entrada-quantidade"
          key={form.key('quantidade')}
          {...form.getInputProps('quantidade')}
        />

        <NumberInput
          label="Custo unitário"
          placeholder="R$ 0,00"
          prefix="R$ "
          decimalScale={2}
          fixedDecimalScale
          decimalSeparator=","
          thousandSeparator="."
          min={0.01}
          allowNegative={false}
          data-testid="entrada-custo"
          key={form.key('valorCusto')}
          {...form.getInputProps('valorCusto')}
        />

        <Select
          label="Fornecedor"
          placeholder="Selecione"
          searchable
          data={fornecedores}
          allowDeselect={false}
          data-testid="entrada-fornecedor"
          key={form.key('fornecedor')}
          {...form.getInputProps('fornecedor')}
        />

        <DatePickerInput
          label="Data de entrada"
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          maxDate={new Date()}
          data-testid="entrada-data"
          key={form.key('dataEntrada')}
          {...form.getInputProps('dataEntrada')}
        />

        <div className={styles.previa} aria-live="polite">
          <div className={styles.previaValor}>
            <span>{precoMuda ? 'Novo valor de venda' : 'Valor de venda sem alteração'}</span>
            <strong
              {...(previaAtual
                ? {
                    'data-testid': 'entrada-previa-preco',
                    'data-valor': String(previaAtual.precoResultante),
                  }
                : {})}
            >
              {formatarBRL(previaAtual?.precoResultante ?? disco.price)}
            </strong>
          </div>
          <p>
            {explicacaoPreco()}
            {previaAtual && ` Com a entrada, o estoque vai para ${previaAtual.estoqueResultante}.`}
          </p>
        </div>
      </div>

      {erros.length > 0 && (
        <Alert color="red" title="A entrada não foi registrada" data-testid="alerta-entrada">
          {erros.map((mensagem) => (
            <div key={mensagem}>{mensagem}</div>
          ))}
        </Alert>
      )}

      <div className={styles.rodape}>
        <Button type="button" variant="default" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={enviando} data-testid="btn-salvar-entrada">
          Registrar entrada
        </Button>
      </div>
    </form>
  );
}
