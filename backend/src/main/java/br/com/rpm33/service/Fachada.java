package br.com.rpm33.service;

import java.util.Map;

import org.springframework.stereotype.Component;

import br.com.rpm33.model.EntidadeDominio;

/**
 * Delega cada operação ao serviço registrado para a entidade. Incluir uma
 * entidade nova não altera esta classe: basta o serviço registrar sua chave no
 * Map, pelo nome do bean.
 */
@Component
public class Fachada implements IFachada {

  private final Map<String, IService> servicos;

  public Fachada(Map<String, IService> servicos) {
    this.servicos = servicos;
  }

  @Override
  public Resultado inserir(EntidadeDominio entidade) {
    return servicoDe(entidade).salvar(entidade);
  }

  @Override
  public Resultado alterar(EntidadeDominio entidade) {
    return servicoDe(entidade).alterar(entidade);
  }

  @Override
  public Resultado consultar(EntidadeDominio entidade) {
    return servicoDe(entidade).consultar(entidade);
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return servicoDe(entidade).excluir(entidade);
  }

  private IService servicoDe(EntidadeDominio entidade) {
    IService servico = servicos.get(entidade.getNomeEntidade());
    if (servico == null) {
      throw new IllegalArgumentException(
          "Nenhum serviço registrado para " + entidade.getNomeEntidade());
    }
    return servico;
  }
}
