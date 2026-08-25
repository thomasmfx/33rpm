import { useState } from 'react';
import classes from './ChatbotBolha.module.scss';
import vinilSvg from '../../../public/images/vinil.svg';
import Chatbot from './Chatbot';

export default function ChatbotBolha() {
  const [isChatAberto, setIsChatAberto] = useState(false);

  return (
    <>
      {isChatAberto && (
        <div className={classes.painel}>
          <Chatbot onFechar={() => setIsChatAberto(false)} />
        </div>
      )}

      <button
        type="button"
        className={classes.bolha}
        aria-label={isChatAberto ? 'Fechar assistente de recomendação' : 'Abrir assistente de recomendação'}
        onClick={() => setIsChatAberto((atual) => !atual)}
      >
        <div className={classes.disco}>
          <div className={classes.capaTraseira} />
          <img src={vinilSvg} className={classes.discoFrente} alt="" />
        </div>
      </button>
    </>
  );
}
