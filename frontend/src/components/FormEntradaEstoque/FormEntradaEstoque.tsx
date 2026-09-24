import painel from '../../pages/Curadoria/Painel.module.scss';
import styles from './FormEntradaEstoque.module.scss';
import { useState } from 'react';
import { Button, NumberInput, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { Disco } from '../../types/disco';
import type { EntradaEstoque } from '../../types/inventario';
import { FORNECEDORES } from '../../types/inventario';
import { precoAposEntrada, validarEntradaEstoque } from '../../utils/estoque';
import {
  formatarBRL,
  maiorValorCusto,
  nomeGrupoPrecificacao,
  obterGrupoPrecificacao,
  TOLERANCIA_PRECO,
} from '../../utils/precificacao';

export interface FormEntradaEstoqueValues {
  quantidade: number;
  valorCusto: number;
  fornecedor: string;
  dataEntrada: string | null;
}

interface FormEntradaEstoqueProps {
  disco: Disco;
  entradas: EntradaEstoque[];
  onClose?: () => void;
  onSubmit: (valores: FormEntradaEstoqueValues) => void;
}

export default function FormEntradaEstoque({
  disco,
  entradas,
  onClose,
  onSubmit,
}: Readonly<FormEntradaEstoqueProps>) {
  // espelham os NumberInput só para a prévia reagir a cada tecla; o valor
  // que vale de verdade é sempre o do form, validado no submit
  const [quantidadePrevia, setQuantidadePrevia] = useState(1);
  const [custoPrevia, setCustoPrevia] = useState(0);

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

    validate: (values) => {
      const erros: Partial<Record<keyof FormEntradaEstoqueValues, string>> =
        {};

      // RN0061 + RN0062 + RNF0064: mesma regra usada no resto do estoque;
      // aqui só decidimos em qual campo mostrar a mensagem que ela devolve
      const mensagem = validarEntradaEstoque(values);
      if (mensagem) {
        if (!Number.isInteger(values.quantidade) || values.quantidade <= 0) {
          erros.quantidade = mensagem;
        } else if (!(values.valorCusto > 0)) {
          erros.valorCusto = mensagem;
        } else if (!values.fornecedor.trim()) {
          erros.fornecedor = mensagem;
        } else {
          erros.dataEntrada = mensagem;
        }
      }

      return erros;
    },
  });

  const maiorCustoRegistrado = maiorValorCusto(entradas, disco.id);
  const grupoPrecificacao = obterGrupoPrecificacao(disco.grupoPrecificacaoId);
  const nomeGrupo = nomeGrupoPrecificacao(disco.grupoPrecificacaoId);
  const margem = grupoPrecificacao?.margemLucro ?? 0;

  // a entrada que o usuário está digitando, para a prévia rodar a mesma conta
  // que o painel vai rodar ao gravar
  const entradasComPrevia = [
    ...entradas,
    {
      id: 'previa',
      discoId: disco.id,
      quantidade: quantidadePrevia,
      valorCusto: custoPrevia,
      fornecedor: '',
      dataEntrada: '',
    },
  ];
  const precoDepois = precoAposEntrada(disco, entradasComPrevia);
  const precoMuda = precoDepois > disco.price + TOLERANCIA_PRECO;
  const maiorCustoComPrevia = maiorValorCusto(entradasComPrevia, disco.id);

  function explicacaoPreco(): string {
    if (disco.autorizacaoGerente !== null) {
      return `O preço foi baixado da margem com autorização de ${disco.autorizacaoGerente}, então a entrada não o reajusta (RN0014).`;
    }
    if (precoMuda) {
      return `Recalculado pelo grupo ${nomeGrupo}: maior custo ${formatarBRL(maiorCustoComPrevia ?? 0)} + ${margem}% (RN0051).`;
    }
    if (custoPrevia <= 0) {
      return `Informe o custo para ver o preço recalculado pelo grupo ${nomeGrupo} (+${margem}%).`;
    }
    return `O valor só sobe quando a entrada custa mais que o maior custo já registrado${
      maiorCustoRegistrado !== null ? `, ${formatarBRL(maiorCustoRegistrado)}` : ''
    } (RN0051).`;
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
          key={form.key('valorCusto')}
          {...form.getInputProps('valorCusto')}
        />

        <Select
          label="Fornecedor"
          placeholder="Selecione"
          searchable
          data={FORNECEDORES}
          allowDeselect={false}
          key={form.key('fornecedor')}
          {...form.getInputProps('fornecedor')}
        />

        <DatePickerInput
          label="Data de entrada"
          placeholder="dd/mm/aaaa"
          valueFormat="DD/MM/YYYY"
          maxDate={new Date()}
          key={form.key('dataEntrada')}
          {...form.getInputProps('dataEntrada')}
        />

        <div className={styles.previa} aria-live="polite">
          <div className={styles.previaValor}>
            <span>{precoMuda ? 'Novo valor de venda' : 'Valor de venda sem alteração'}</span>
            <strong>{formatarBRL(precoDepois)}</strong>
          </div>
          <p>
            {explicacaoPreco()} Com a entrada, o estoque vai para{' '}
            {disco.estoque + quantidadePrevia}.
          </p>
        </div>
      </div>

      <div className={styles.rodape}>
        <Button type="button" variant="default" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" size="sm">
          Registrar entrada
        </Button>
      </div>
    </form>
  );
}
