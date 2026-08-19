import { useState } from 'react';
import styles from './CuradoriaClientes.module.scss'

interface Cliente {
  id: string;
  nome: string;
}

function CuradoriaClientes() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);  

  return (
    <div className={styles.painelClientes}>
      
    </div>
  )
}

export default CuradoriaClientes;