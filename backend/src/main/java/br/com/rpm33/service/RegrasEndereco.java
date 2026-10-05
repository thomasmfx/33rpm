package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import br.com.rpm33.model.Cidade;
import br.com.rpm33.model.Endereco;
import br.com.rpm33.model.Estado;
import br.com.rpm33.repository.CidadeRepository;
import br.com.rpm33.repository.EstadoRepository;

/** RF0026 e RN0023: a mesma regra de endereço no cadastro do cliente e no checkout. */
@Component
public class RegrasEndereco {

  private final CidadeRepository cidadeRepository;
  private final EstadoRepository estadoRepository;

  public RegrasEndereco(CidadeRepository cidadeRepository, EstadoRepository estadoRepository) {
    this.cidadeRepository = cidadeRepository;
    this.estadoRepository = estadoRepository;
  }

  /** Nome, tipo e composição de um endereço, identificado pelo nome nas mensagens. */
  public List<String> validar(Endereco endereco) {
    List<String> erros = new ArrayList<>();
    String identificacao = vazio(endereco.getNome()) ? "endereço" : "'" + endereco.getNome() + "'";
    if (vazio(endereco.getNome())) {
      erros.add("Informe um nome para o endereço (RF0026).");
    }
    if (!Endereco.ENTREGA.equals(endereco.getTipo()) && !Endereco.COBRANCA.equals(endereco.getTipo())
        && !Endereco.AMBOS.equals(endereco.getTipo())) {
      erros.add("Tipo inválido no " + identificacao + ": use entrega, cobranca ou ambos.");
    }
    erros.addAll(camposObrigatoriosDoEndereco(endereco, identificacao));
    return erros;
  }

  /** RN0023: tudo obrigatório, menos observações. */
  public List<String> camposObrigatoriosDoEndereco(Endereco endereco, String identificacao) {
    List<String> erros = new ArrayList<>();
    if (vazio(endereco.getTipoResidencia())) {
      erros.add("Informe o tipo de residência no " + identificacao + " (RN0023).");
    }
    if (vazio(endereco.getTipoLogradouro())) {
      erros.add("Informe o tipo de logradouro no " + identificacao + " (RN0023).");
    }
    if (vazio(endereco.getLogradouro())) {
      erros.add("Informe o logradouro no " + identificacao + " (RN0023).");
    }
    if (vazio(endereco.getNumero())) {
      erros.add("Informe o número no " + identificacao + " (RN0023).");
    }
    if (vazio(endereco.getBairro())) {
      erros.add("Informe o bairro no " + identificacao + " (RN0023).");
    }
    if (endereco.getCep() == null || endereco.getCep().length() != 8) {
      erros.add("CEP deve ter 8 dígitos no " + identificacao + " (RN0023).");
    }
    if (endereco.getCidade() == null || vazio(endereco.getCidade().getDesc())) {
      erros.add("Informe a cidade no " + identificacao + " (RN0023).");
    }
    if (endereco.getCidade() == null || endereco.getCidade().getEstado() == null
        || vazio(endereco.getCidade().getEstado().getDesc())) {
      erros.add("Informe o estado no " + identificacao + " (RN0023).");
    }
    if (vazio(endereco.getPais())) {
      erros.add("Informe o país no " + identificacao + " (RN0023).");
    }
    return erros;
  }

  /** A interface manda cidade como texto livre; aqui ela vira registro reaproveitável. */
  public Cidade resolverCidade(Cidade informada, List<String> erros) {
    Estado estado = resolverEstado(informada, erros);
    if (estado == null) {
      return null;
    }
    String nomeCidade = informada.getDesc().trim();
    return cidadeRepository.findByDescIgnoreCaseAndEstado(nomeCidade, estado)
        .orElseGet(() -> {
          Cidade nova = new Cidade();
          nova.setDesc(nomeCidade);
          nova.setEstado(estado);
          return cidadeRepository.save(nova);
        });
  }

  /** Confere o estado sem gravar nada: a cotação do checkout só precisa da UF. */
  public Estado resolverEstado(Cidade informada, List<String> erros) {
    if (informada == null || informada.getEstado() == null) {
      return null;
    }
    Optional<Estado> estado = estadoRepository.findByDescIgnoreCase(
        informada.getEstado().getDesc().trim());
    if (estado.isEmpty()) {
      erros.add("Estado não registrado no sistema.");
      return null;
    }
    return estado.get();
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
