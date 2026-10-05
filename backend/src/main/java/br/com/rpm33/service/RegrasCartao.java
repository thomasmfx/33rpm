package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import br.com.rpm33.model.BandeiraCartao;
import br.com.rpm33.model.Cartao;
import br.com.rpm33.repository.BandeiraCartaoRepository;

/** RN0024 e RN0025: a mesma regra de cartão no cadastro do cliente e no checkout. */
@Component
public class RegrasCartao {

  private final BandeiraCartaoRepository bandeiraCartaoRepository;

  public RegrasCartao(BandeiraCartaoRepository bandeiraCartaoRepository) {
    this.bandeiraCartaoRepository = bandeiraCartaoRepository;
  }

  /** RN0024. */
  public List<String> validarCartoes(Iterable<Cartao> cartoes) {
    List<String> erros = new ArrayList<>();
    for (Cartao cartao : cartoes) {
      if (cartao.getNumero() == null || cartao.getNumero().length() < 13
          || cartao.getNumero().length() > 19) {
        erros.add("Número de cartão inválido (RN0024).");
      }
      if (vazio(cartao.getNomeImpresso())) {
        erros.add("Informe o nome impresso no cartão (RN0024).");
      }
      if (cartao.getBandeira() == null
          || (cartao.getBandeira().getId() == null && vazio(cartao.getBandeira().getDesc()))) {
        erros.add("Selecione a bandeira do cartão (RN0024).");
      }
      if (cartao.getCodigoSeguranca() == null || cartao.getCodigoSeguranca().length() < 3
          || cartao.getCodigoSeguranca().length() > 4) {
        erros.add("Código de segurança inválido (RN0024).");
      }
    }
    return erros;
  }

  /** RN0025: a bandeira precisa estar registrada no sistema. */
  public BandeiraCartao resolverBandeira(BandeiraCartao informada, List<String> erros) {
    if (informada == null) {
      return null;
    }
    Optional<BandeiraCartao> encontrada = informada.getId() != null
        ? bandeiraCartaoRepository.findById(informada.getId())
        : bandeiraCartaoRepository.findByDescIgnoreCase(informada.getDesc().trim());
    if (encontrada.isEmpty()) {
      erros.add("Bandeira de cartão não registrada no sistema (RN0025).");
      return null;
    }
    return encontrada.get();
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
