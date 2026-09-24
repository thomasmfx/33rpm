import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classes from './ChatbotBolha.module.scss';
import Chatbot from './Chatbot';
import Vinil from '../Vinil/Vinil';

export default function ChatbotBolha() {
  // o CTA da Home chega com ?assistente: a conversa abre sem depender de remontar
  const [parametros, setParametros] = useSearchParams();
  const pedidoPelaUrl = parametros.has('assistente');
  const [isChatAberto, setIsChatAberto] = useState(false);
  const aberto = isChatAberto || pedidoPelaUrl;

  function fechar(): void {
    setIsChatAberto(false);
    if (pedidoPelaUrl) {
      const semAssistente = new URLSearchParams(parametros);
      semAssistente.delete('assistente');
      setParametros(semAssistente, { replace: true });
    }
  }

  return (
    <>
      {aberto && (
        <div className={classes.painel}>
          <Chatbot onFechar={fechar} />
        </div>
      )}

      <button
        type="button"
        className={classes.bolha}
        aria-label={aberto ? 'Fechar assistente de recomendação' : 'Abrir assistente de recomendação'}
        onClick={() => (aberto ? fechar() : setIsChatAberto(true))}
      >
        <Vinil className={classes.disco} />
      </button>
    </>
  );
}
