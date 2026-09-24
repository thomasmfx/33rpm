import styles from './FormDisco.module.scss';
import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  NumberInput,
  MultiSelect,
  Select,
  TagsInput,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Dimensoes, Disco } from '../../types/disco';
import type { EntradaEstoque } from '../../types/inventario';
import {
  FORMATOS_DISCO,
  EDICOES,
  FORMATO_PADRAO,
  GRUPO_PRECIFICACAO_PADRAO,
  GRUPOS_PRECIFICACAO,
} from '../../types/inventario';
import {
  obterEdicao,
  obterFormato,
  sugestoesDeCadastro,
} from '../../utils/catalogo';
import {
  exigeAutorizacaoGerente,
  formatarBRL,
  maiorValorCusto,
  obterGrupoPrecificacao,
  valorVendaSugerido,
} from '../../utils/precificacao';
import { apenasDigitos } from '../../utils/texto';
import Capa from '../Capa/Capa';

export interface FormDiscoValues {
  title: string;
  artist: string;
  releaseYear: number;
  genres: string[];
  styles: string[];
  price: number;
  coverSrc: string;
  gravadora: string;
  formatoId: string;
  edicaoIds: string[];
  codigoCatalogo: string;
  codigoBarras: string;
  numeroFaixas: number;
  duracao: string;
  descricao: string;
  dimensoes: Dimensoes;
  grupoPrecificacaoId: string;
  autorizacaoGerente: string | null;
}

interface FormDiscoProps {
  initialValues?: Disco;
  isEdit: boolean;
  entradas: EntradaEstoque[];
  discos: Disco[];
  onClose?: () => void;
  onSubmit: (valores: FormDiscoValues) => void;
}

const OPCOES_GRUPO_PRECIFICACAO = GRUPOS_PRECIFICACAO.map((grupo) => ({
  value: grupo.id,
  label: `${grupo.nome} (+${grupo.margemLucro}%)`,
}));

const OPCOES_FORMATO = FORMATOS_DISCO.map((formato) => ({
  value: formato.id,
  label: `${formato.nome} — ${formato.descricao}`,
}));

const OPCOES_EDICAO = EDICOES.map((edicao) => ({
  value: edicao.id,
  label: edicao.nome,
}));

// descrição embaixo do campo, para os inputs vizinhos na grade ficarem alinhados
const DESCRICAO_ABAIXO: ('label' | 'input' | 'description' | 'error')[] = [
  'label',
  'input',
  'description',
  'error',
];

export default function FormDisco({
  initialValues,
  isEdit,
  entradas,
  discos,
  onClose,
  onSubmit,
}: Readonly<FormDiscoProps>) {
  // sem id ainda em cadastro novo, então nenhuma entrada de estoque casa com ele (RN0013)
  const discoId = initialValues?.id ?? -1;
  // RN0051: só existe preço a formar quando alguma entrada já custeou o disco
  const custoBase = maiorValorCusto(entradas, discoId);

  // o formato já entra escolhido, então as dimensões entram junto: abrir o
  // cadastro com 'LP' selecionado e quatro campos zerados era incoerente
  const formatoInicial = initialValues?.formatoId || FORMATO_PADRAO;
  const dimensoesIniciais =
    initialValues?.dimensoes ?? obterFormato(formatoInicial)?.dimensoes;
  const sugestoes = useMemo(() => sugestoesDeCadastro(discos), [discos]);

  const form = useForm<FormDiscoValues>({
    mode: 'uncontrolled',
    initialValues: {
      title: initialValues?.title || '',
      artist: initialValues?.artist || '',
      releaseYear: initialValues?.releaseYear ?? new Date().getFullYear(),
      genres: initialValues?.genres ?? [],
      styles: initialValues?.styles ?? [],
      price: initialValues?.price ?? 0,
      coverSrc: initialValues?.coverSrc || '',
      gravadora: initialValues?.gravadora || '',
      formatoId: formatoInicial,
      edicaoIds: initialValues?.edicaoIds ?? [],
      codigoCatalogo: initialValues?.codigoCatalogo || '',
      codigoBarras: initialValues?.codigoBarras || '',
      numeroFaixas: initialValues?.numeroFaixas ?? 1,
      duracao: initialValues?.duracao || '',
      descricao: initialValues?.descricao || '',
      dimensoes: {
        altura: dimensoesIniciais?.altura ?? 0,
        largura: dimensoesIniciais?.largura ?? 0,
        profundidade: dimensoesIniciais?.profundidade ?? 0,
        peso: dimensoesIniciais?.peso ?? 0,
      },
      grupoPrecificacaoId:
        initialValues?.grupoPrecificacaoId || GRUPO_PRECIFICACAO_PADRAO,
      autorizacaoGerente: initialValues?.autorizacaoGerente ?? '',
    },

    validate: {
      title: (value) => (value.trim().length === 0 ? 'Informe o título' : null),
      artist: (value) => (value.trim().length === 0 ? 'Informe o artista' : null),
      releaseYear: (value) =>
        value < 1900 || value > 2030
          ? 'O ano deve estar entre 1900 e 2030'
          : null,
      genres: (value) =>
        value.length === 0 ? 'Selecione ao menos um gênero (RN0012)' : null,
      // RN0013: sem custo registrado o preço nem aparece na tela, então não há o que validar
      price: (value) =>
        custoBase !== null && value <= 0
          ? 'Informe um preço de venda maior que zero'
          : null,
      coverSrc: (value) =>
        value.trim().length === 0 ? 'Informe a URL ou caminho da capa' : null,
      gravadora: (value) => (value.trim().length === 0 ? 'Informe a gravadora' : null),
      formatoId: (value) => (!value ? 'Selecione um formato' : null),
      edicaoIds: (value) =>
        value.length === 0 ? 'Selecione ao menos um tipo de edição' : null,
      codigoCatalogo: (value) =>
        value.trim().length === 0 ? 'Informe o código de catálogo' : null,
      codigoBarras: (value) =>
        apenasDigitos(value).length !== 13
          ? 'O código de barras deve ter 13 dígitos'
          : null,
      numeroFaixas: (value) =>
        !Number.isInteger(value) || value <= 0
          ? 'Informe o número de faixas'
          : null,
      descricao: (value) =>
        value.trim().length === 0 ? 'Informe a descrição' : null,
      grupoPrecificacaoId: (value) =>
        !value ? 'Selecione um grupo de precificação' : null,
      dimensoes: {
        altura: (value) => (value > 0 ? null : 'Informe a altura em cm'),
        largura: (value) => (value > 0 ? null : 'Informe a largura em cm'),
        profundidade: (value) =>
          value > 0 ? null : 'Informe a profundidade em cm',
        peso: (value) => (value > 0 ? null : 'Informe o peso em g'),
      },

      // RN0014: preço abaixo do sugerido pelo grupo só vale com aval do gerente
      // (e sem custo registrado o campo nem existe na tela)
      autorizacaoGerente: (value, values) => {
        if (custoBase === null) return null;

        const sugeridoAtual = valorVendaSugerido(
          { id: discoId, grupoPrecificacaoId: values.grupoPrecificacaoId },
          entradas,
        );
        if (
          exigeAutorizacaoGerente(values.price, sugeridoAtual) &&
          !value?.trim()
        ) {
          return 'RN0014: informe a autorização do gerente de vendas';
        }
        return null;
      },
    },
  });

  // modo uncontrolled não expõe o valor atual no render, então espelhamos aqui
  // o que a RF0052 precisa observar em tempo real: grupo, preço e capa
  const [grupoSelecionado, setGrupoSelecionado] = useState(
    initialValues?.grupoPrecificacaoId ?? '',
  );
  const [precoAtual, setPrecoAtual] = useState(initialValues?.price ?? 0);
  const [coverSrcAtual, setCoverSrcAtual] = useState(
    initialValues?.coverSrc ?? '',
  );
  const [edicoesSelecionadas, setEdicoesSelecionadas] = useState<string[]>(
    initialValues?.edicaoIds ?? [],
  );

  form.watch('grupoPrecificacaoId', ({ value }) => setGrupoSelecionado(value));
  form.watch('price', ({ value }) =>
    setPrecoAtual(typeof value === 'number' ? value : Number(value) || 0),
  );
  form.watch('coverSrc', ({ value }) => setCoverSrcAtual(value));
  form.watch('edicaoIds', ({ value }) => setEdicoesSelecionadas(value));

  const grupoInfo = obterGrupoPrecificacao(grupoSelecionado);
  const sugerido = valorVendaSugerido(
    { id: discoId, grupoPrecificacaoId: grupoSelecionado },
    entradas,
  );
  const precisaAutorizacao = exigeAutorizacaoGerente(precoAtual, sugerido);

  /**
   * Preenche as dimensões com o preset do formato — ponto de partida, os campos
   * seguem editáveis. Precisa ser campo a campo: em modo uncontrolled só
   * setFieldValue renumera a key e repinta o input; setValues troca o valor por
   * baixo e a tela continua mostrando as medidas antigas.
   */
  function handleTrocarFormato(novoFormatoId: string): void {
    form.setFieldValue('formatoId', novoFormatoId);

    const formato = obterFormato(novoFormatoId);
    if (!formato) return;

    form.setFieldValue('dimensoes.altura', formato.dimensoes.altura);
    form.setFieldValue('dimensoes.largura', formato.dimensoes.largura);
    form.setFieldValue('dimensoes.profundidade', formato.dimensoes.profundidade);
    form.setFieldValue('dimensoes.peso', formato.dimensoes.peso);
  }

  function handleSubmit(values: FormDiscoValues): void {
    // RN0013: sem custo registrado ainda não há preço a formar; ele nasce na 1ª entrada
    if (custoBase === null) {
      onSubmit({ ...values, price: 0, autorizacaoGerente: null });
      return;
    }

    const sugeridoFinal = valorVendaSugerido(
      { id: discoId, grupoPrecificacaoId: values.grupoPrecificacaoId },
      entradas,
    );
    const precisaAutorizacaoFinal = exigeAutorizacaoGerente(
      values.price,
      sugeridoFinal,
    );

    onSubmit({
      ...values,
      // preço voltou pra dentro da margem: a autorização anterior não vale mais
      autorizacaoGerente: precisaAutorizacaoFinal
        ? values.autorizacaoGerente
        : null,
    });
  }

  return (
    <form className={styles.form} onSubmit={form.onSubmit(handleSubmit)}>
      <section className={styles.secao}>
        <h3>Identificação</h3>

        <div className={styles.gradeTitulo}>
          <TextInput
            label="Título"
            placeholder="Ex: The Dark Side of the Moon"
            key={form.key('title')}
            {...form.getInputProps('title')}
          />
          <TextInput
            label="Artista"
            placeholder="Ex: Pink Floyd"
            key={form.key('artist')}
            {...form.getInputProps('artist')}
          />
          <NumberInput
            label="Ano de lançamento"
            placeholder="1973"
            min={1900}
            max={2030}
            decimalScale={0}
            allowNegative={false}
            key={form.key('releaseYear')}
            {...form.getInputProps('releaseYear')}
          />
        </div>

        <div className={styles.grade2}>
          <TagsInput
            label="Gêneros"
            placeholder="Digite e pressione Enter"
            description="RN0012: pelo menos um gênero"
            inputWrapperOrder={DESCRICAO_ABAIXO}
            data={sugestoes.generos}
            key={form.key('genres')}
            {...form.getInputProps('genres')}
          />
          <TagsInput
            label="Estilos (opcional)"
            placeholder="Digite e pressione Enter"
            data={sugestoes.estilos}
            key={form.key('styles')}
            {...form.getInputProps('styles')}
          />
        </div>

        <div className={styles.gradeCapa}>
          <div className={styles.previaCapa}>
            {coverSrcAtual ? (
              <Capa src={coverSrcAtual} alt="Pré-visualização da capa" />
            ) : (
              <span>Sem capa</span>
            )}
          </div>
          <TextInput
            label="Capa (URL ou caminho)"
            placeholder="/covers/disco.jpg"
            key={form.key('coverSrc')}
            {...form.getInputProps('coverSrc')}
          />
        </div>
      </section>

      <section className={styles.secao}>
        <h3>Ficha técnica</h3>

        <div className={styles.grade2}>
          <Autocomplete
            label="Gravadora"
            data={sugestoes.gravadoras}
            key={form.key('gravadora')}
            {...form.getInputProps('gravadora')}
          />
          <div className={styles.campoComAjuda}>
            <MultiSelect
              label="Edição"
              placeholder={
                edicoesSelecionadas.length ? undefined : 'Selecione os tipos'
              }
              data={OPCOES_EDICAO}
              clearable
              key={form.key('edicaoIds')}
              {...form.getInputProps('edicaoIds')}
            />
            {/* a explicação de cada tipo escolhido — não cabe em description
                agora que o campo aceita mais de um */}
            {edicoesSelecionadas.map((id) => (
              <p key={id} className={styles.ajuda}>
                <strong>{obterEdicao(id)?.nome}:</strong> {obterEdicao(id)?.descricao}
              </p>
            ))}
          </div>
        </div>

        <div className={styles.grade2}>
          <TextInput
            label="Código de catálogo"
            disabled={isEdit}
            key={form.key('codigoCatalogo')}
            {...form.getInputProps('codigoCatalogo')}
          />
          <TextInput
            label="Código de barras"
            placeholder="0000000000000"
            disabled={isEdit}
            key={form.key('codigoBarras')}
            {...form.getInputProps('codigoBarras')}
          />
        </div>

        <div className={styles.grade2}>
          <NumberInput
            label="Número de faixas"
            min={1}
            decimalScale={0}
            allowNegative={false}
            key={form.key('numeroFaixas')}
            {...form.getInputProps('numeroFaixas')}
          />
          <TextInput
            label="Duração total (opcional)"
            placeholder="42:15"
            key={form.key('duracao')}
            {...form.getInputProps('duracao')}
          />
        </div>

        <Textarea
          label="Descrição"
          autosize
          minRows={3}
          key={form.key('descricao')}
          {...form.getInputProps('descricao')}
        />
      </section>

      <section className={styles.secao}>
        <h3>Dimensões e logística</h3>

        <Select
          label="Formato"
          placeholder="Selecione um formato"
          data={OPCOES_FORMATO}
          allowDeselect={false}
          key={form.key('formatoId')}
          {...form.getInputProps('formatoId')}
          onChange={(value) => handleTrocarFormato(value ?? '')}
        />

        <div className={styles.grade4}>
          <NumberInput
            label="Altura (cm)"
            min={0}
            step={0.1}
            decimalScale={2}
            allowNegative={false}
            key={form.key('dimensoes.altura')}
            {...form.getInputProps('dimensoes.altura')}
          />
          <NumberInput
            label="Largura (cm)"
            min={0}
            step={0.1}
            decimalScale={2}
            allowNegative={false}
            key={form.key('dimensoes.largura')}
            {...form.getInputProps('dimensoes.largura')}
          />
          <NumberInput
            label="Profundidade (cm)"
            min={0}
            step={0.1}
            decimalScale={2}
            allowNegative={false}
            key={form.key('dimensoes.profundidade')}
            {...form.getInputProps('dimensoes.profundidade')}
          />
          <NumberInput
            label="Peso (g)"
            min={0}
            step={1}
            decimalScale={0}
            allowNegative={false}
            key={form.key('dimensoes.peso')}
            {...form.getInputProps('dimensoes.peso')}
          />
        </div>

        <p className={styles.ajuda}>
          As medidas vieram do formato selecionado e podem ser ajustadas.
        </p>
      </section>

      <section className={styles.secao}>
        <h3>Precificação</h3>

        <div className={styles.grade2}>
          <Select
            label="Grupo de precificação"
            placeholder="Selecione um grupo"
            description="A margem do grupo sobre o maior custo em estoque define o valor de venda (RF0052 / RN0051)."
            inputWrapperOrder={DESCRICAO_ABAIXO}
            data={OPCOES_GRUPO_PRECIFICACAO}
            allowDeselect={false}
            key={form.key('grupoPrecificacaoId')}
            {...form.getInputProps('grupoPrecificacaoId')}
          />

          {custoBase === null ? (
            <p className={styles.aviso}>
              O valor de venda será calculado na primeira entrada em estoque,
              pela margem do grupo escolhido (RF0052 / RN0013).
            </p>
          ) : (
            <NumberInput
              label="Preço de venda"
              description={
                sugerido === null
                  ? 'O valor de venda será calculado na primeira entrada em estoque.'
                  : `Valor sugerido pelo grupo: ${formatarBRL(sugerido)} (maior custo ${formatarBRL(custoBase)} + ${grupoInfo?.margemLucro ?? 0}%)`
              }
              inputWrapperOrder={DESCRICAO_ABAIXO}
              prefix="R$ "
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator="."
              decimalSeparator=","
              min={0}
              allowNegative={false}
              key={form.key('price')}
              {...form.getInputProps('price')}
            />
          )}
        </div>

        {custoBase !== null && precisaAutorizacao && (
          <>
            <Alert color="orange" title="Autorização necessária">
              RN0014: o preço informado está abaixo do valor sugerido pelo
              grupo de precificação. É preciso registrar a autorização de um
              gerente de vendas para manter esse valor.
            </Alert>
            <TextInput
              label="Autorização do gerente de vendas"
              placeholder="Nome de quem autorizou"
              key={form.key('autorizacaoGerente')}
              {...form.getInputProps('autorizacaoGerente')}
            />
          </>
        )}
      </section>

      <div className={styles.rodape}>
        <Button type="button" variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">{isEdit ? 'Salvar alterações' : 'Cadastrar disco'}</Button>
      </div>
    </form>
  );
}
