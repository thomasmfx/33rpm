package br.com.rpm33.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.DiscoFiltro;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/**
 * RF0015: os campos do disco podem filtrar, isolados ou combinados.
 */
final class DiscoSpecs {

  private DiscoSpecs() {
  }

  static Specification<Disco> de(DiscoFiltro filtro) {
    return (root, query, cb) -> {
      List<Predicate> predicados = new ArrayList<>();

      if (preenchido(filtro.getTitulo())) {
        predicados.add(contemSemAcento(cb, root.get("titulo"), filtro.getTitulo()));
      }
      if (preenchido(filtro.getArtista())) {
        predicados.add(contemSemAcento(cb, root.get("artista").get("nome"), filtro.getArtista()));
      }
      if (preenchido(filtro.getGravadora())) {
        predicados.add(
            contemSemAcento(cb, root.get("gravadora").get("nome"), filtro.getGravadora()));
      }
      if (preenchido(filtro.getCategoria())) {
        // subconsulta, e não join, para um disco com vários estilos não sair repetido
        Subquery<Long> comCategoria = query.subquery(Long.class);
        Root<Disco> mesmo = comCategoria.from(Disco.class);
        Join<Disco, Categoria> categoria = mesmo.join("categorias");
        comCategoria.select(mesmo.get("id")).where(cb.equal(mesmo.get("id"), root.get("id")),
            contemSemAcento(cb, categoria.get("desc"), filtro.getCategoria()));
        predicados.add(cb.exists(comCategoria));
      }
      if (preenchido(filtro.getCodigo())) {
        String termo = curinga(filtro.getCodigo().trim().toLowerCase());
        predicados.add(cb.or(cb.like(cb.lower(root.get("codigo")), termo),
            cb.like(cb.lower(root.get("codigoCatalogo")), termo),
            cb.like(cb.lower(root.get("codigoBarras")), termo)));
      }
      if (filtro.getAnoMin() != null) {
        predicados.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("anoLancamento"),
            LocalDate.of(filtro.getAnoMin(), 1, 1)));
      }
      if (filtro.getAnoMax() != null) {
        predicados.add(cb.lessThanOrEqualTo(root.<LocalDate>get("anoLancamento"),
            LocalDate.of(filtro.getAnoMax(), 12, 31)));
      }
      if (filtro.getPrecoMin() != null) {
        predicados.add(
            cb.greaterThanOrEqualTo(root.<BigDecimal>get("precoVenda"), filtro.getPrecoMin()));
      }
      if (filtro.getPrecoMax() != null) {
        predicados.add(
            cb.lessThanOrEqualTo(root.<BigDecimal>get("precoVenda"), filtro.getPrecoMax()));
      }
      if (preenchido(filtro.getGrupo())) {
        predicados.add(cb.equal(cb.lower(root.get("grupoPrecificacao").get("nome")),
            filtro.getGrupo().trim().toLowerCase()));
      }
      if (preenchido(filtro.getFormato())) {
        predicados.add(cb.equal(cb.lower(root.get("formato").get("nome")),
            filtro.getFormato().trim().toLowerCase()));
      }
      if (DiscoFiltro.ATIVOS.equals(filtro.getStatus())) {
        predicados.add(cb.isTrue(root.get("isAtivo")));
      }
      if (DiscoFiltro.INATIVOS.equals(filtro.getStatus())) {
        predicados.add(cb.isFalse(root.get("isAtivo")));
      }
      if (DiscoFiltro.DISPONIVEL.equals(filtro.getEstoque())) {
        predicados.add(cb.greaterThan(root.<Integer>get("estoque"), 0));
      }
      if (DiscoFiltro.ESGOTADO.equals(filtro.getEstoque())) {
        predicados.add(cb.equal(root.get("estoque"), 0));
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
        cb.literal(curinga(termo.trim().toLowerCase())));
    return cb.like(campoNormalizado, termoNormalizado);
  }

  private static String curinga(String termo) {
    return "%" + termo + "%";
  }

  private static boolean preenchido(String valor) {
    return valor != null && !valor.isBlank();
  }
}
