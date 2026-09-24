import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  createTheme,
  Drawer,
  Indicator,
  Input,
  InputWrapper,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  PasswordInput,
  Popover,
  Radio,
  SegmentedControl,
  Select,
  Skeleton,
  Table,
  Tabs,
  TagsInput,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type { ButtonVariant, CSSVariablesResolver, MantineColorsTuple } from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import classes from './mantine.module.scss';

type VarianteBotao = ButtonVariant | 'link';

declare module '@mantine/core' {
  export interface ButtonProps {
    variant?: VarianteBotao;
  }
}

/*
 * Paletas do guia. O índice 6 é o tom "filled" (primaryShade) e o 7 é o hover,
 * por isso o 7 do vinil é mais claro que o 6: o guia clareia no hover.
 */
const vinil: MantineColorsTuple = [
  '#F5F5F3', '#E3E1DA', '#CFCCC3', '#B5B2AA', '#8F8C84',
  '#6E6B64', '#141413', '#2E2D2A', '#0B0B0A', '#050505',
];

const cinza: MantineColorsTuple = [
  '#F5F5F3', '#F0F0EE', '#E3E1DA', '#CFCCC3', '#B5B2AA',
  '#A09D95', '#8F8C84', '#6E6B64', '#3D3B37', '#26251F',
];

const selo: MantineColorsTuple = [
  '#FDF3EE', '#FBE3D6', '#F7C6AD', '#F7B08C', '#F08A5D',
  '#E4693A', '#D9501F', '#C2451B', '#B8421A', '#7E2A10',
];

const erro: MantineColorsTuple = [
  '#FBEDEA', '#F4D9D3', '#E3C4BE', '#D99A8F', '#CB7466',
  '#C05545', '#B83A2A', '#9E3123', '#7A2418', '#5C1B12',
];

const sucesso: MantineColorsTuple = [
  '#E9F2EC', '#D3E7DA', '#B3D5BF', '#8EC0A0', '#66A67F',
  '#468D62', '#2F7A4E', '#26653F', '#1F5436', '#163D27',
];

const cobalto: MantineColorsTuple = [
  '#ECEFFC', '#D3DAF7', '#A9B6EF', '#7D90E6', '#5A71DF',
  '#3F58DA', '#2743D6', '#1F37B3', '#192C8F', '#122069',
];

const violeta: MantineColorsTuple = [
  '#F1ECFB', '#DFD3F5', '#C1A9EC', '#A17EE2', '#875CDA',
  '#7749D6', '#6B3FD4', '#5832B2', '#46288F', '#331D69',
];

/** Alertas planos do guia: fundo tingido, sem borda, sem ícone. */
const ALERTAS: Record<string, { fundo: string; texto: string }> = {
  green: { fundo: '#E9F2EC', texto: '#1F5436' },
  red: { fundo: '#FBEDEA', texto: '#7A2418' },
  gray: { fundo: '#F5F5F3', texto: '#3D3B37' },
  dark: { fundo: '#F5F5F3', texto: '#3D3B37' },
  blue: { fundo: '#FFFFFF', texto: '#141413' },
  orange: { fundo: '#FFFFFF', texto: '#141413' },
};

export const resolverVariaveis: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': '#6E6B64',
    '--mantine-color-default-border': '#CFCCC3',
    '--mantine-color-placeholder': '#A09D95',
    '--mantine-color-disabled': '#E3E1DA',
    '--mantine-color-disabled-color': '#8F8C84',
    '--mantine-color-disabled-border': '#E3E1DA',
    '--mantine-color-error': '#B83A2A',
  },
  dark: {},
});

// Todo campo nasce no tamanho do guia (48px); filtros e formulários inline usam sm (40px)
const CAMPOS = {
  TextInput,
  PasswordInput,
  Select,
  MultiSelect,
  NumberInput,
  Textarea,
  Autocomplete,
  TagsInput,
  DateInput,
  DatePickerInput,
};

const componentesDeCampo = Object.fromEntries(
  Object.entries(CAMPOS).map(([nome, componente]) => [
    nome,
    componente.extend({ defaultProps: { size: 'md' } }),
  ]),
);

export const tema = createTheme({
  white: '#FEFEFD',
  black: '#141413',
  colors: {
    dark: vinil,
    gray: cinza,
    orange: selo,
    red: erro,
    green: sucesso,
    blue: cobalto,
    violet: violeta,
  },
  primaryColor: 'dark',
  primaryShade: 6,
  defaultRadius: 2,
  radius: { xs: '2px', sm: '2px', md: '2px', lg: '2px', xl: '16px' },
  fontFamily: '"Uxum Grotesque", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", monospace',
  fontSizes: { xs: '12px', sm: '14px', md: '15px', lg: '18px', xl: '20px' },
  headings: {
    fontFamily: '"Uxum Grotesque", sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '44px', lineHeight: '1.05' },
      h2: { fontSize: '28px', lineHeight: '1.15' },
      h3: { fontSize: '18px', lineHeight: '1.3' },
    },
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.12)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.14)',
    md: '0 16px 48px rgba(0, 0, 0, 0.16)',
  },
  components: {
    ...componentesDeCampo,
    Button: Button.extend({
      defaultProps: { size: 'md' },
      classNames: { root: classes.botao },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: 'default', color: 'dark' },
      classNames: { root: classes.acaoIcone },
    }),
    Input: Input.extend({
      classNames: {
        wrapper: classes.campoWrapper,
        input: classes.campoInput,
      },
    }),
    InputWrapper: InputWrapper.extend({
      classNames: {
        label: classes.campoRotulo,
        description: classes.campoDescricao,
        error: classes.campoErro,
      },
    }),
    Checkbox: Checkbox.extend({
      defaultProps: { color: 'dark' },
      classNames: {
        root: classes.checkbox,
        input: classes.checkboxInput,
        label: classes.checkboxRotulo,
      },
    }),
    Radio: Radio.extend({
      defaultProps: { color: 'dark' },
      classNames: {
        root: classes.radio,
        radio: classes.radioInput,
        label: classes.radioRotulo,
      },
    }),
    RadioCard: Radio.Card.extend({
      classNames: { card: classes.radioCard },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { color: 'dark', transitionDuration: 120 },
      classNames: {
        root: classes.segmentado,
        indicator: classes.segmentadoIndicador,
        label: classes.segmentadoRotulo,
        control: classes.segmentadoControle,
      },
    }),
    Badge: Badge.extend({
      defaultProps: { radius: 0, variant: 'outline', color: 'dark' },
      classNames: { root: classes.etiqueta, label: classes.etiquetaRotulo },
    }),
    Alert: Alert.extend({
      defaultProps: { radius: 0 },
      classNames: {
        root: classes.alerta,
        title: classes.alertaTitulo,
        body: classes.alertaCorpo,
        message: classes.alertaMensagem,
        icon: classes.alertaIcone,
        closeButton: classes.alertaFechar,
      },
      styles: (_tema, props) => {
        const cor = ALERTAS[props.color ?? 'gray'] ?? ALERTAS.gray;
        // "destaque": filete de 3px à esquerda, para o que muda (reserva, aviso)
        const destaque = props.color === 'orange' || props.color === 'blue';
        const filete = props.color === 'blue' ? '#2743D6' : '#D9501F';
        return {
          root: {
            background: cor.fundo,
            color: cor.texto,
            border: destaque ? '1px solid #E3E1DA' : 'none',
            borderLeft: destaque ? 'none' : undefined,
            boxShadow: destaque ? `inset 3px 0 0 ${filete}` : undefined,
          },
          title: { color: cor.texto },
          message: { color: cor.texto },
        };
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 0,
        size: 520,
        centered: true,
        transitionProps: { duration: 120 },
        overlayProps: { color: '#141413', backgroundOpacity: 0.4 },
      },
      classNames: {
        content: classes.modalConteudo,
        header: classes.modalCabecalho,
        title: classes.modalTitulo,
        body: classes.modalCorpo,
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        position: 'right',
        size: 480,
        radius: 0,
        transitionProps: { duration: 160 },
        overlayProps: { color: '#141413', backgroundOpacity: 0.32 },
      },
      classNames: {
        content: classes.drawerConteudo,
        header: classes.drawerCabecalho,
        title: classes.modalTitulo,
        body: classes.drawerCorpo,
      },
    }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: 0, horizontalSpacing: 'sm' },
      classNames: { table: classes.tabela, th: classes.tabelaTh, td: classes.tabelaTd },
    }),
    Tabs: Tabs.extend({
      defaultProps: { color: 'dark' },
      classNames: { root: classes.abas, list: classes.abasLista, tab: classes.abasAba },
    }),
    Menu: Menu.extend({
      defaultProps: { radius: 2, shadow: 'md' },
      classNames: {
        dropdown: classes.menuDropdown,
        item: classes.menuItem,
        label: classes.menuRotulo,
      },
    }),
    Popover: Popover.extend({
      defaultProps: { radius: 2, shadow: 'md' },
      classNames: { dropdown: classes.popoverDropdown },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { color: 'dark', radius: 2 },
      classNames: { tooltip: classes.dica },
    }),
    Pagination: Pagination.extend({
      defaultProps: { color: 'dark', radius: 2 },
    }),
    Indicator: Indicator.extend({
      defaultProps: { color: 'orange' },
    }),
    Skeleton: Skeleton.extend({
      defaultProps: { radius: 2 },
      classNames: { root: classes.esqueleto },
    }),
  },
  cursorType: 'pointer',
});
