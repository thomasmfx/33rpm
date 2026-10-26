/** RN0046: aviso ao cliente, ligado à compra de que fala. */
export interface Notificacao {
  id: string;
  pedidoId: string | null;
  mensagem: string;
  isLida: boolean;
  data: string;
}
