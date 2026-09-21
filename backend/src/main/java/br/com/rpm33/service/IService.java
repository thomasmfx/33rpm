package br.com.rpm33.service;

import br.com.rpm33.model.EntidadeDominio;

/** Contrato de todo serviço de domínio. A Fachada só conhece esta interface. */
public interface IService {

  Resultado salvar(EntidadeDominio entidade);

  Resultado alterar(EntidadeDominio entidade);

  Resultado consultar(EntidadeDominio entidade);

  Resultado excluir(EntidadeDominio entidade);
}
