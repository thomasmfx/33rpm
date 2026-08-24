import { useState } from 'react';
import {
  Button,
  Divider,
  Flex,
  Group,
  Image,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { Disco } from '../../types/disco';
import type { EntradaEstoque } from '../../types/inventario';
import { FORNECEDORES } from '../../types/inventario';
import { IconX } from '@tabler/icons-react';
import { precoAposEntrada, validarEntradaEstoque } from '../../utils/estoque';
import {
  formatarBRL,
  maiorValorCusto,
  nomeGrupoPrecificacao,
  obterGrupoPrecificacao,
  TOLERANCIA_PRECO,
  valorVendaSugerido,
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
  const valorSugerido = valorVendaSugerido(disco, entradasComPrevia);
  const precoDepois = precoAposEntrada(disco, entradasComPrevia);
  const precoMuda = precoDepois > disco.price + TOLERANCIA_PRECO;

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Flex justify="space-between" align="center" mb="md">
        <Text fw={600} size="lg">
          Nova entrada em estoque
        </Text>
        <Button variant="subtle" color="gray" px="xs" onClick={onClose}>
          <IconX stroke={1.5} />
        </Button>
      </Flex>

      <Group gap="md" align="flex-start" mb="lg" wrap="nowrap">
        <Image
          src={disco.coverSrc}
          alt={disco.title}
          w={60}
          h={60}
          radius="sm"
          fit="cover"
        />
        <Stack gap={0} flex={1}>
          <Text fw={600} size="lg" lineClamp={1}>
            {disco.title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {disco.artist}
          </Text>
        </Stack>
        <Text size="sm" fw={500}>
          Estoque atual: {disco.estoque}
        </Text>
      </Group>

      <Stack gap="sm">
        <Group grow>
          <NumberInput
            label="Quantidade"
            placeholder="Ex: 10"
            withAsterisk
            min={1}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            key={form.key('quantidade')}
            {...form.getInputProps('quantidade')}
          />

          <NumberInput
            label="Valor de custo (unitário)"
            placeholder="Ex: 45,00"
            withAsterisk
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
        </Group>

        <Group grow>
          <Select
            label="Fornecedor"
            placeholder="Selecione o fornecedor"
            withAsterisk
            searchable
            data={FORNECEDORES}
            allowDeselect={false}
            key={form.key('fornecedor')}
            {...form.getInputProps('fornecedor')}
          />

          <DatePickerInput
            label="Data de entrada"
            placeholder="Selecione uma data"
            valueFormat="DD/MM/YYYY"
            withAsterisk
            maxDate={new Date()}
            key={form.key('dataEntrada')}
            {...form.getInputProps('dataEntrada')}
          />
        </Group>

        <Paper withBorder p="sm">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Maior custo já registrado
              </Text>
              <Text size="sm" fw={500}>
                {maiorCustoRegistrado !== null
                  ? formatarBRL(maiorCustoRegistrado)
                  : '—'}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Custo desta entrada
              </Text>
              <Text size="sm" fw={500}>
                {custoPrevia > 0 ? formatarBRL(custoPrevia) : '—'}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Grupo de precificação
              </Text>
              <Text size="sm" fw={500}>
                {nomeGrupoPrecificacao(disco.grupoPrecificacaoId)}
                {grupoPrecificacao
                  ? ` (+${grupoPrecificacao.margemLucro}%)`
                  : ''}
              </Text>
            </Group>

            <Divider my={2} />

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Valor sugerido pelo grupo
              </Text>
              <Text size="sm" fw={500}>
                {valorSugerido !== null ? formatarBRL(valorSugerido) : '—'}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {precoMuda
                  ? 'Novo valor de venda'
                  : 'Valor de venda (sem alteração)'}
              </Text>
              <Text size="sm" fw={700}>
                {formatarBRL(precoDepois)}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {disco.autorizacaoGerente !== null
                ? `O preço deste disco foi baixado da margem com autorização de ${disco.autorizacaoGerente}, então a entrada não o reajusta — RN0014.`
                : 'O valor de venda só sobe quando a entrada tem custo maior que o já registrado — RN0051.'}
            </Text>

            <Divider my={2} />

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Estoque após a entrada
              </Text>
              <Text size="sm" fw={500}>
                {disco.estoque + quantidadePrevia}
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Stack>

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" color="dark">
          Registrar entrada
        </Button>
      </Group>
    </form>
  );
}
