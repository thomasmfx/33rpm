package br.com.rpm33.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.Cupom;

public interface CupomRepository extends JpaRepository<Cupom, Long> {

  List<Cupom> findByClienteIdOrderByTipoIdAscCodigoAsc(Long clienteId);

  List<Cupom> findByClienteIdAndIsUtilizadoFalseOrderByTipoIdAscCodigoAsc(Long clienteId);

  List<Cupom> findAllByOrderByTipoIdAscCodigoAsc();

  List<Cupom> findByPedidoOrigemIdIn(Collection<Long> pedidoIds);

  boolean existsByCodigoIgnoreCase(String codigo);

  /** Devolve 0 quando outro pedido já consumiu o cupom: a trava fica na própria linha. */
  @Modifying
  @Query("UPDATE Cupom c SET c.isUtilizado = true WHERE c.id = :id AND c.isUtilizado = false")
  int consumir(@Param("id") Long id);
}
