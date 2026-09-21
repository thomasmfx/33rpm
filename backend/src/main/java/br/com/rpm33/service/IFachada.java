package br.com.rpm33.service;

import br.com.rpm33.model.EntidadeDominio;

/** Ponto de entrada da camada de negócio. Os controladores dependem só desta interface. */
public interface IFachada {

  Resultado inserir(EntidadeDominio entidade);

  Resultado alterar(EntidadeDominio entidade);

  Resultado consultar(EntidadeDominio entidade);

  Resultado excluir(EntidadeDominio entidade);
}
