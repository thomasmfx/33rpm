package br.com.rpm33.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.ClienteFiltro;
import br.com.rpm33.model.Telefone;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

/**
 * RF0024: todos os campos de identificação podem filtrar, isolados ou combinados.
 */
final class ClienteSpecs {

  private ClienteSpecs() {
  }

  static Specification<Cliente> de(ClienteFiltro filtro) {
    return (root, query, cb) -> {
      List<Predicate> predicados = new ArrayList<>();

      if (preenchido(filtro.getNome())) {
        predicados.add(contemSemAcento(cb, root.get("nome"), filtro.getNome()));
      }
      if (preenchido(filtro.getEmail())) {
        predicados.add(contemSemAcento(cb, root.get("email"), filtro.getEmail()));
      }
      if (preenchido(filtro.getCodigo())) {
        predicados.add(cb.like(cb.lower(root.get("codigo")),
            curinga(filtro.getCodigo().toLowerCase())));
      }
      if (preenchido(apenasDigitos(filtro.getCpf()))) {
        predicados.add(cb.like(root.get("cpf"), curinga(apenasDigitos(filtro.getCpf()))));
      }
      if (preenchido(apenasDigitos(filtro.getTelefone()))) {
        Join<Cliente, Telefone> telefone = root.join("telefone", JoinType.LEFT);
        Expression<String> completo = cb.concat(telefone.get("ddd"), telefone.get("numero"));
        predicados.add(cb.like(completo, curinga(apenasDigitos(filtro.getTelefone()))));
      }
      if (ClienteFiltro.ATIVOS.equals(filtro.getStatus())) {
        predicados.add(cb.isTrue(root.get("isAtivo")));
      }
      if (ClienteFiltro.INATIVOS.equals(filtro.getStatus())) {
        predicados.add(cb.isFalse(root.get("isAtivo")));
      }
      if (filtro.getRankingMinimo() != null && filtro.getRankingMinimo() > 0) {
        predicados.add(cb.greaterThanOrEqualTo(root.get("ranking"), filtro.getRankingMinimo()));
      }

      return cb.and(predicados.toArray(new Predicate[0]));
    };
  }

  /** Espelha o contemTexto da interface: ignora acento e caixa. */
  private static Predicate contemSemAcento(CriteriaBuilder cb, Expression<String> campo,
      String termo) {
    Expression<String> campoNormalizado =
        cb.function("unaccent", String.class, cb.lower(campo));
    Expression<String> termoNormalizado = cb.function("unaccent", String.class,
        cb.literal(curinga(termo.toLowerCase())));
    return cb.like(campoNormalizado, termoNormalizado);
  }

  private static String curinga(String termo) {
    return "%" + termo + "%";
  }

  private static String apenasDigitos(String valor) {
    return valor == null ? null : valor.replaceAll("\\D", "");
  }

  private static boolean preenchido(String valor) {
    return valor != null && !valor.isBlank();
  }
}
