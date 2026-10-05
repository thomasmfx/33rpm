package br.com.rpm33.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.EntradaEstoque;

public interface EntradaEstoqueRepository extends JpaRepository<EntradaEstoque, Long> {

  /** RN0051: vale sempre o maior custo já registrado para o disco. */
  @Query("select max(e.valorCusto) from EntradaEstoque e where e.disco.id = :discoId")
  BigDecimal maiorCusto(@Param("discoId") Long discoId);

  List<EntradaEstoque> findByDiscoIdOrderByDataEntradaDescIdDesc(Long discoId);

  List<EntradaEstoque> findAllByOrderByDataEntradaDescIdDesc();
}
